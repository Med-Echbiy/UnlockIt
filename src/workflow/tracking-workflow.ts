import useAchievementsStore from "@/store/achievements-store";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import useMyGamesStore from "@/store/my-games-store";
import useParsingWorkflow from "./parser/parse-workflow";
import { toast } from "sonner";
import useProfileStore from "@/store/profile-store";

const useTrackingWorkflow = () => {
  const { trackAchievementsFiles, getTrackedAchievementsFiles } =
    useAchievementsStore();

  // Helper function to play notification sound with proper path resolution
  const playNotificationSound = async (soundFile: string) => {
    try {
      let audioSrc: string;

      // Check if we're in a Tauri environment
      const isTauri = typeof (window as any).__TAURI__ !== "undefined";

      if (isTauri) {
        try {
          // First try to resolve as a bundled resource
          const resourcePath = await resolveResource(soundFile);
          audioSrc = convertFileSrc(resourcePath);
        } catch (resourceError) {
          // Fallback to direct file conversion if resource resolution fails
          audioSrc = convertFileSrc(soundFile);
        }
      } else {
        // For development mode, use direct path
        audioSrc = `/${soundFile}`;
      }

      const audio = new Audio(audioSrc);
      audio.volume = 1;
      await audio.play();
    } catch (error) {
      // Failed to play notification sound
    }
  };
  const { getGameById } = useMyGamesStore();
  const { parseAchievements } = useParsingWorkflow({
    exePath: "",
    appid: 0,
  });
  const { getProfile } = useProfileStore();
  const isWatcherSetup = useRef(false);
  const currentPaths = useRef<string>("");
  const eventListenerSetup = useRef(false);
  const processedAchievements = useRef<Set<string>>(new Set()); // Track processed achievements
  const lastProcessedTime = useRef<number>(0); // Debounce mechanism
  const isProcessingNotification = useRef<boolean>(false); // Prevent concurrent notifications

  useEffect(() => {
    const getPaths = trackAchievementsFiles.map((item) => item.filePath);
    const pathsString = JSON.stringify(getPaths.sort()); // Sort for consistent cons
    if (
      getPaths.length > 0 &&
      (pathsString !== currentPaths.current || !isWatcherSetup.current)
    ) {
      currentPaths.current = pathsString;
      isWatcherSetup.current = true;

      invoke("track_files", { paths: Array.from(new Set(getPaths)) })
        .then(() => {
          // track_files invoked successfully
        })
        .catch(() => {
          isWatcherSetup.current = false;
        });
    } else if (getPaths.length === 0) {
      isWatcherSetup.current = false;
      currentPaths.current = "";
    }
  }, [trackAchievementsFiles.length]);
  useEffect(() => {
    if (eventListenerSetup.current) {
      return;
    }

    eventListenerSetup.current = true;

    const unlisten = listen("file-change", (event) => {
      // Debounce mechanism - prevent processing events too quickly
      const now = Date.now();
      if (now - lastProcessedTime.current < 1000) {
        // 1 second debounce
        return;
      }

      const payload = event.payload as {
        path: string;
        kind: string;
        added_lines: string[];
        content: string;
      };

      const game = getGameBasedOnPath(payload.path);

      if (game) {
        const { appId, exePath } = game;
        if (payload.added_lines && payload.added_lines.length > 0) {
          const achievementNames = new Set<string>();
          const seenInThisEvent = new Set<string>(); // Track duplicates within this event only

          payload.added_lines.forEach((line) => {
            const achievementRegex = /\[(.+?)\]/g;
            let match;

            while ((match = achievementRegex.exec(line)) !== null) {
              const achievementName = match[1].trim();

              if (achievementName) {
                // Create a unique key for this achievement in this game
                const achievementKey = `${appId}_${achievementName}`;

                // Only skip if we've seen it in THIS event (handles duplicate lines from Rust)
                if (!seenInThisEvent.has(achievementKey)) {
                  // Check if we processed this recently (within debounce window)
                  if (!processedAchievements.current.has(achievementKey)) {
                    achievementNames.add(achievementName);
                    processedAchievements.current.add(achievementKey);
                    seenInThisEvent.add(achievementKey);
                  }
                }
              }
            }
          });

          // Check if TENOKE format achievements were added (if bracket regex found nothing)
          if (achievementNames.size === 0) {
            const handledByTenokeDetection = detectTenokeAchievementAdditions(
              payload.added_lines,
              appId,
              exePath,
              game
            );

            if (handledByTenokeDetection) {
              return; // Exit early - TENOKE function already triggered notifications
            }
          }

          if (achievementNames.size > 0) {
            // Prevent concurrent notification processing
            if (isProcessingNotification.current) {
              return;
            }

            // Update the last processed time
            lastProcessedTime.current = now;
            isProcessingNotification.current = true;

            parseAchievements(appId, exePath)
              .then(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                const { achievements: updatedAchievements } =
                  useAchievementsStore.getState();
                const currentAchievements = updatedAchievements.find(
                  (ach) => Number(ach.gameId) === Number(appId)
                );

                if (
                  currentAchievements?.game?.availableGameStats?.achievements
                ) {
                  const allAchievements =
                    currentAchievements.game.availableGameStats.achievements;
                  const unlockedAchievements = Array.from(achievementNames)
                    .map((achievementName) => {
                      return allAchievements.find(
                        (ach) =>
                          ach.name === achievementName ||
                          ach.displayName === achievementName
                      );
                    })
                    .filter(Boolean) // Remove undefined entries
                    .filter(
                      (ach) =>
                        ach?.achievedAt &&
                        ach.achievedAt !== "0" &&
                        ach.achievedAt !== ""
                    ); // Only include actually unlocked achievements
                  if (unlockedAchievements.length > 0) {
                    // Show web toast notification ONCE for all achievements
                    toast(
                      `${unlockedAchievements.length} new achievement${
                        unlockedAchievements.length > 1 ? "s" : ""
                      } unlocked!`,
                      {
                        duration: 3000,
                        style: {
                          backgroundColor: "#a21caf", // tailwindcss purple-500
                        },
                      }
                    );

                    // Play sound ONCE for all achievements
                    try {
                      const soundPath = getProfile().notificationSound;
                      if (soundPath) {
                        await playNotificationSound(soundPath);
                      }

                      // Show ONE native notification for all achievements
                      const firstAchievement = unlockedAchievements[0];
                      const achievementTitle =
                        unlockedAchievements.length === 1
                          ? firstAchievement?.displayName ||
                            firstAchievement?.name ||
                            "Achievement Unlocked"
                          : `${unlockedAchievements.length} Achievements Unlocked!`;
                      await invoke("toast_notification", {
                        iconPath:
                          firstAchievement?.icon || game.header_image || "",
                        gameName: game.name,
                        achievementName: achievementTitle,
                        soundPath: soundPath || null,
                        hero: game.header_image || "",
                        progress: null,
                        isRare: false,
                      });
                    } catch (error) {
                    } finally {
                      // Reset processing flag
                      isProcessingNotification.current = false;
                    }
                  } else {
                    isProcessingNotification.current = false;
                  }
                } else {
                  isProcessingNotification.current = false;
                }
              })
              .catch(() => {
                isProcessingNotification.current = false; // Reset flag on error
              });
          } else {
          }
        } else {
          // No new lines added, but check if content changed (for JSON modifications like GSE Saves)
          if (payload.content && payload.content.length > 0) {
            // NEW: Try JSON state change detection FIRST (10-second window, immediate detection)
            const handledByJsonDetection = detectJsonAchievementStateChanges(
              payload.content,
              appId,
              exePath,
              game
            );

            if (handledByJsonDetection) {
              return; // Exit early - no need for the 30-second fallback
            }
            // ORIGINAL FALLBACK CODE (30-second window) - only runs if JSON detection found nothing
            // Prevent concurrent notification processing
            if (isProcessingNotification.current) {
              return;
            }

            // Update the last processed time
            lastProcessedTime.current = now;
            isProcessingNotification.current = true;

            // Re-parse achievements from full content to detect changes
            parseAchievements(appId, exePath)
              .then(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                const { achievements: updatedAchievements } =
                  useAchievementsStore.getState();
                const currentAchievements = updatedAchievements.find(
                  (ach) => Number(ach.gameId) === Number(appId)
                );

                if (
                  currentAchievements?.game?.availableGameStats?.achievements
                ) {
                  const allAchievements =
                    currentAchievements.game.availableGameStats.achievements;

                  // Find recently unlocked achievements (unlocked in the last 30 seconds)
                  const now = Math.floor(Date.now() / 1000);
                  const recentlyUnlockedAchievements = allAchievements.filter(
                    (ach) => {
                      const achievedAt = parseInt(ach.achievedAt || "0");
                      return (
                        achievedAt > 0 &&
                        achievedAt !== 0 &&
                        ach.achievedAt !== "" &&
                        now - achievedAt <= 30 // Unlocked within last 30 seconds
                      );
                    }
                  );
                  if (recentlyUnlockedAchievements.length > 0) {
                    // Show web toast notification ONCE for all achievements
                    toast(
                      `${recentlyUnlockedAchievements.length} new achievement${
                        recentlyUnlockedAchievements.length > 1 ? "s" : ""
                      } unlocked!`,
                      {
                        duration: 3000,
                        style: {
                          backgroundColor: "#a21caf", // tailwindcss purple-500
                        },
                      }
                    );

                    // Play sound ONCE for all achievements
                    try {
                      const soundPath = getProfile().notificationSound;
                      if (soundPath) {
                        await playNotificationSound(soundPath);
                      }

                      // Show ONE native notification for all achievements
                      const firstAchievement = recentlyUnlockedAchievements[0];
                      const achievementTitle =
                        recentlyUnlockedAchievements.length === 1
                          ? firstAchievement?.displayName ||
                            firstAchievement?.name ||
                            "Achievement Unlocked"
                          : `${recentlyUnlockedAchievements.length} Achievements Unlocked!`;
                      await invoke("toast_notification", {
                        iconPath:
                          firstAchievement?.icon || game.header_image || "",
                        gameName: game.name,
                        achievementName: achievementTitle,
                        soundPath: soundPath || null,
                        hero: game.header_image || "",
                        progress: null,
                        isRare: false,
                      });
                    } catch (error) {
                    } finally {
                      // Reset processing flag
                      isProcessingNotification.current = false;
                    }
                  } else {
                    isProcessingNotification.current = false;
                  }
                } else {
                  isProcessingNotification.current = false;
                }
              })
              .catch(() => {
                isProcessingNotification.current = false; // Reset flag on error
              });
          } else {
          }
        }
      }
    });

    return () => {
      eventListenerSetup.current = false;
      unlisten.then((fn) => fn());
    };
  }, []); // Empty dependency array - setup listener only once
  useEffect(() => {
    return () => {
      isWatcherSetup.current = false;
      currentPaths.current = "";
      eventListenerSetup.current = false;
      processedAchievements.current.clear(); // Clear processed achievements on cleanup
      isProcessingNotification.current = false; // Reset processing flag
    };
  }, []);

  // Clear old processed achievements every 5 minutes to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      processedAchievements.current.clear();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  /**
   * Detects TENOKE INI-based achievement additions when new lines are added
   * TENOKE format: "achievement_name" = {unlocked = true, time = 1761878592}
   * Unlike other formats, TENOKE adds new lines when achievements unlock
   */
  function detectTenokeAchievementAdditions(
    addedLines: string[],
    appId: number,
    exePath: string,
    game: any
  ): boolean {
    try {
      const newlyUnlockedAchievements: string[] = [];

      for (const line of addedLines) {
        // Parse TENOKE format: "achievement_name" = {unlocked = true, time = 1761878592}
        // Note: Rust adds "Line X: " prefix, so we need to handle that
        const tenokeRegex = /"([^"]+)"\s*=\s*\{([^}]+)\}/;
        const tenokeMatch = line.match(tenokeRegex);

        if (tenokeMatch) {
          const achievementName = tenokeMatch[1].trim();
          const achievementData = tenokeMatch[2];

          // Verify it's actually unlocked
          const unlockedMatch = achievementData.match(/unlocked\s*=\s*true/i);
          const timeMatch = achievementData.match(/time\s*=\s*(\d+)/);

          if (unlockedMatch && timeMatch && achievementName) {
            const unlockTime = Number(timeMatch[1]);
            const now = Math.floor(Date.now() / 1000);
            const timeDiff = now - unlockTime;

            // Only detect achievements unlocked in the last 10 seconds
            if (timeDiff <= 10 && !isNaN(unlockTime) && unlockTime > 0) {
              newlyUnlockedAchievements.push(achievementName);
            }
          }
        }
      }

      // If we found newly unlocked achievements, trigger notifications
      if (newlyUnlockedAchievements.length > 0) {
        // Use the same notification pipeline
        handleAchievementNotifications(
          newlyUnlockedAchievements,
          appId,
          exePath,
          game
        );

        return true; // Signal that we handled this
      }

      return false; // No TENOKE achievements detected
    } catch (error) {
      return false;
    }
  }

  /**
   * Detects JSON-based achievement state changes (earned: false → true)
   * Specifically handles Goldberg GSE Saves format where no new lines are added
   * This runs BEFORE the 30-second fallback to provide immediate detection
   */
  function detectJsonAchievementStateChanges(
    content: string,
    appId: number,
    exePath: string,
    game: any
  ): boolean {
    try {
      // Only process JSON files
      if (!content.trim().startsWith("{") && !content.trim().startsWith("[")) {
        return false;
      }
      // Parse the JSON content
      const data = JSON.parse(content);
      const newlyUnlockedAchievements: string[] = [];

      // Handle GSE Saves format (object with achievement names as keys)
      if (
        typeof data === "object" &&
        !Array.isArray(data) &&
        !data.achievements
      ) {
        for (const [achievementName, achData] of Object.entries(data)) {
          const achievement = achData as any;

          // Check if earned is explicitly true and has a recent timestamp
          if (achievement.earned === true && achievement.earned_time) {
            const earnedTime = Number(achievement.earned_time);
            const now = Math.floor(Date.now() / 1000);
            const timeDiff = now - earnedTime;

            // Only detect achievements earned in the last 10 seconds
            // This is tighter than the 30-second fallback window
            if (timeDiff <= 10) {
              newlyUnlockedAchievements.push(achievementName);
            }
          }
        }
      }

      // Handle standard Goldberg JSON format (object with achievements property)
      if (data.achievements && typeof data.achievements === "object") {
        for (const [achievementName, achData] of Object.entries(
          data.achievements
        )) {
          const achievement = achData as any;

          if (
            achievement.earned ||
            achievement.unlocked ||
            achievement.achieved
          ) {
            const unlockTime =
              achievement.unlock_time ||
              achievement.unlocktime ||
              achievement.time ||
              0;

            if (unlockTime > 0) {
              const now = Math.floor(Date.now() / 1000);
              const timeDiff = now - Number(unlockTime);

              if (timeDiff <= 10) {
                newlyUnlockedAchievements.push(achievementName);
              }
            }
          }
        }
      }

      // If we found newly unlocked achievements, trigger notifications
      if (newlyUnlockedAchievements.length > 0) {
        // Use the same notification pipeline as the main workflow
        handleAchievementNotifications(
          newlyUnlockedAchievements,
          appId,
          exePath,
          game
        );

        return true; // Signal that we handled this
      }

      return false; // No new achievements detected
    } catch (error) {
      return false;
    }
  }

  /**
   * Centralized achievement notification handler
   * Used by both added_lines detection and JSON state change detection
   */
  async function handleAchievementNotifications(
    achievementNames: string[] | Set<string>,
    appId: number,
    exePath: string,
    game: any
  ) {
    const achievementNamesArray = Array.isArray(achievementNames)
      ? achievementNames
      : Array.from(achievementNames);
    try {
      // Re-parse achievements to get latest state
      await parseAchievements(appId, exePath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { achievements: updatedAchievements } =
        useAchievementsStore.getState();
      const currentAchievements = updatedAchievements.find(
        (ach) => Number(ach.gameId) === Number(appId)
      );

      if (!currentAchievements?.game?.availableGameStats?.achievements) {
        return;
      }

      const allAchievements =
        currentAchievements.game.availableGameStats.achievements;

      // Find matching unlocked achievements
      const unlockedAchievements = achievementNamesArray
        .map((achievementName) => {
          return allAchievements.find(
            (ach) =>
              ach.name === achievementName ||
              ach.displayName === achievementName
          );
        })
        .filter(Boolean)
        .filter(
          (ach) =>
            ach?.achievedAt && ach.achievedAt !== "0" && ach.achievedAt !== ""
        );
      if (unlockedAchievements.length > 0) {
        // Show web toast notification
        toast(
          `${unlockedAchievements.length} new achievement${
            unlockedAchievements.length > 1 ? "s" : ""
          } unlocked!`,
          {
            duration: 3000,
            style: {
              backgroundColor: "#a21caf",
            },
          }
        );

        // Play sound
        const soundPath = getProfile().notificationSound;
        if (soundPath) {
          await playNotificationSound(soundPath);
        }

        // Show native notification
        const firstAchievement = unlockedAchievements[0];
        const achievementTitle =
          unlockedAchievements.length === 1
            ? firstAchievement?.displayName ||
              firstAchievement?.name ||
              "Achievement Unlocked"
            : `${unlockedAchievements.length} Achievements Unlocked!`;

        await invoke("toast_notification", {
          iconPath: firstAchievement?.icon || game.header_image || "",
          gameName: game.name,
          achievementName: achievementTitle,
          soundPath: soundPath || null,
          hero: game.header_image || "",
          progress: null,
          isRare: false,
        });
      } else {
      }
    } catch (error) {}
  }

  function getGameBasedOnPath(path: string) {
    const appid =
      getTrackedAchievementsFiles().find((item) => item.filePath === path)
        ?.appid ?? "";
    if (!appid) {
      return false;
    }
    const game = getGameById(String(appid));
    return game ?? false;
  }

  return {};
};

export default useTrackingWorkflow;
