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
          console.warn(
            "Resource resolution failed, trying direct path:",
            resourceError
          );
          audioSrc = convertFileSrc(soundFile);
        }
      } else {
        // For development mode, use direct path
        audioSrc = `/${soundFile}`;
      }

      console.log("Playing notification sound from:", audioSrc);
      const audio = new Audio(audioSrc);
      audio.volume = 1;
      await audio.play();
    } catch (error) {
      console.warn("Failed to play notification sound:", error);
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
      console.log("Setting up new file watcher...");

      currentPaths.current = pathsString;
      isWatcherSetup.current = true;

      console.log("Invoking track_files with paths:", getPaths);
      invoke("track_files", { paths: Array.from(new Set(getPaths)) })
        .then(() => {
          console.log("track_files invoked successfully");
        })
        .catch((error) => {
          console.error("Error invoking track_files:", error);
          isWatcherSetup.current = false;
        });
    } else if (getPaths.length === 0) {
      console.log("No paths to track - getPaths is empty");
      isWatcherSetup.current = false;
      currentPaths.current = "";
    } else {
      console.log("Watcher already setup for these paths, skipping...");
    }
  }, [trackAchievementsFiles.length]);
  useEffect(() => {
    if (eventListenerSetup.current) {
      console.log("Event listener already setup, skipping...");
      return;
    }

    console.log("Setting up file-change event listener...");
    eventListenerSetup.current = true;

    const unlisten = listen("file-change", (event) => {
      console.log("=== FILE CHANGE EVENT RECEIVED ===");
      console.log("Full event object:", event);
      console.log("Event payload:", event.payload);

      // Debounce mechanism - prevent processing events too quickly
      const now = Date.now();
      if (now - lastProcessedTime.current < 1000) {
        // 1 second debounce
        console.log("Event ignored due to debounce mechanism");
        return;
      }

      const payload = event.payload as {
        path: string;
        kind: string;
        added_lines: string[];
        content: string;
      };

      console.log("Typed payload:", payload);
      console.log("Looking for game based on path:", payload.path);

      const game = getGameBasedOnPath(payload.path);
      console.log("Found game:", game);

      if (game) {
        const { appId, exePath } = game;
        console.log("Game details - appId:", appId, "exePath:", exePath);
        console.log(
          "🔍 DEBUG: Checking added_lines length:",
          payload.added_lines?.length
        );
        console.log("🔍 DEBUG: added_lines content:", payload.added_lines);
        if (payload.added_lines && payload.added_lines.length > 0) {
          console.log("Processing achievement changes for game:", game.name);
          console.log("Added lines:", payload.added_lines);
          const achievementNames = new Set<string>();

          payload.added_lines.forEach((line) => {
            console.log("Processing line:", line);
            console.log("Line type:", typeof line);
            console.log("Line length:", line.length);
            const achievementRegex = /\[(.+?)\]/g;
            let match;

            while ((match = achievementRegex.exec(line)) !== null) {
              console.log("Full match:", match);
              const achievementName = match[1].trim();
              console.log("Raw match found:", match[1]);
              console.log("Trimmed achievement name:", achievementName);

              if (achievementName) {
                // Create a unique key for this achievement in this game
                const achievementKey = `${appId}_${achievementName}`;

                // Only add if not already processed recently
                if (!processedAchievements.current.has(achievementKey)) {
                  achievementNames.add(achievementName);
                  processedAchievements.current.add(achievementKey);
                  console.log("Added new achievement to set:", achievementName);
                } else {
                  console.log(
                    "Achievement already processed recently, skipping:",
                    achievementName
                  );
                }
              }
            }
            if (line.includes("[") && line.includes("]")) {
              console.log("Line contains brackets - manual check passed");
              const manualMatch = line.match(/\[(.+?)\]/);
              if (manualMatch) {
                console.log("Manual regex match found:", manualMatch[1]);
              } else {
                console.log("Manual regex match failed");
              }
            } else {
              console.log("Line does not contain brackets");
            }
          });

          console.log(
            "Unique achievement names found:",
            Array.from(achievementNames)
          );

          // Check if TENOKE format achievements were added (if bracket regex found nothing)
          if (achievementNames.size === 0) {
            console.log(
              "No bracket-format achievements found, checking for TENOKE format..."
            );
            const handledByTenokeDetection = detectTenokeAchievementAdditions(
              payload.added_lines,
              appId,
              exePath,
              game
            );

            if (handledByTenokeDetection) {
              console.log("✅ TENOKE addition detection handled the event");
              return; // Exit early - TENOKE function already triggered notifications
            }
          }

          if (achievementNames.size > 0) {
            // Prevent concurrent notification processing
            if (isProcessingNotification.current) {
              console.log(
                "Already processing notifications, skipping this batch"
              );
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

                  console.log(
                    "Found matching achievements:",
                    unlockedAchievements.map((a) => ({
                      name: a?.name,
                      displayName: a?.displayName,
                      achievedAt: a?.achievedAt,
                    }))
                  );

                  if (unlockedAchievements.length > 0) {
                    console.log("🎉 NEW ACHIEVEMENTS UNLOCKED!");

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
                      console.log("=== SOUND DEBUG ===");
                      console.log("Sound path from profile:", soundPath);
                      console.log("Sound path type:", typeof soundPath);
                      console.log(
                        "Sound path exists:",
                        soundPath ? "Yes" : "No"
                      );

                      if (soundPath) {
                        console.log("Attempting to play notification sound...");
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

                      console.log(
                        "Showing single native notification for",
                        unlockedAchievements.length,
                        "achievements"
                      );

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
                      console.error("Failed to send notification:", error);
                    } finally {
                      // Reset processing flag
                      isProcessingNotification.current = false;
                    }
                  } else {
                    console.log("No newly unlocked achievements found");
                    isProcessingNotification.current = false;
                  }
                } else {
                  console.log("No achievement data available in store");
                  isProcessingNotification.current = false;
                }
              })
              .catch((error) => {
                console.error("Error parsing achievements:", error);
                isProcessingNotification.current = false; // Reset flag on error
              });
          } else {
            console.log("No achievement patterns found in added lines");
          }
        } else {
          // No new lines added, but check if content changed (for JSON modifications like GSE Saves)
          console.log("No new lines added, checking for content changes...");

          if (payload.content && payload.content.length > 0) {
            // NEW: Try JSON state change detection FIRST (10-second window, immediate detection)
            console.log(
              "🎯 Attempting JSON state change detection for earned=false→true cases..."
            );
            const handledByJsonDetection = detectJsonAchievementStateChanges(
              payload.content,
              appId,
              exePath,
              game
            );

            if (handledByJsonDetection) {
              console.log(
                "✅ JSON state change detection handled the event, skipping fallback"
              );
              return; // Exit early - no need for the 30-second fallback
            }

            console.log(
              "No recent JSON state changes detected, falling back to 30-second window check..."
            );

            // ORIGINAL FALLBACK CODE (30-second window) - only runs if JSON detection found nothing
            console.log(
              "Content available, processing full content for changes"
            );

            // Prevent concurrent notification processing
            if (isProcessingNotification.current) {
              console.log(
                "Already processing notifications, skipping this batch"
              );
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

                  console.log(
                    "Found recently unlocked achievements:",
                    recentlyUnlockedAchievements.map((a) => ({
                      name: a?.name,
                      displayName: a?.displayName,
                      achievedAt: a?.achievedAt,
                      timeDiff: now - parseInt(a?.achievedAt || "0"),
                    }))
                  );

                  if (recentlyUnlockedAchievements.length > 0) {
                    console.log(
                      "🎉 NEW ACHIEVEMENTS UNLOCKED (from content change)!"
                    );

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
                      console.log("=== SOUND DEBUG ===");
                      console.log("Sound path from profile:", soundPath);

                      if (soundPath) {
                        console.log("Attempting to play notification sound...");
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

                      console.log(
                        "Showing single native notification for",
                        recentlyUnlockedAchievements.length,
                        "achievements (content change detection)"
                      );

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
                      console.error("Failed to send notification:", error);
                    } finally {
                      // Reset processing flag
                      isProcessingNotification.current = false;
                    }
                  } else {
                    console.log(
                      "No recently unlocked achievements found in content"
                    );
                    isProcessingNotification.current = false;
                  }
                } else {
                  console.log("No achievement data available in store");
                  isProcessingNotification.current = false;
                }
              })
              .catch((error) => {
                console.error(
                  "Error parsing achievements from content:",
                  error
                );
                isProcessingNotification.current = false; // Reset flag on error
              });
          } else {
            console.log("No content available, skipping achievement check");
          }
        }
      }
    });

    return () => {
      console.log(
        "Event listener cleanup - unregistering file-change listener"
      );
      eventListenerSetup.current = false;
      unlisten.then((fn) => fn());
    };
  }, []); // Empty dependency array - setup listener only once
  useEffect(() => {
    return () => {
      console.log("TrackingWorkflow component unmounting - cleaning up");
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
      console.log("Clearing processed achievements cache");
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
      console.log("🔍 Checking for TENOKE achievement additions...");

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
              console.log(
                `✅ Found TENOKE achievement addition: ${achievementName} (${timeDiff}s ago)`
              );
              newlyUnlockedAchievements.push(achievementName);
            }
          }
        }
      }

      // If we found newly unlocked achievements, trigger notifications
      if (newlyUnlockedAchievements.length > 0) {
        console.log(
          `🎯 TENOKE Addition Detection: Found ${newlyUnlockedAchievements.length} newly unlocked achievements`
        );

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
      console.error("Error in TENOKE addition detection:", error);
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
        console.log("Not a JSON file, skipping JSON state change detection");
        return false;
      }

      console.log("🔍 Checking for JSON achievement state changes...");

      // Parse the JSON content
      const data = JSON.parse(content);
      const newlyUnlockedAchievements: string[] = [];

      // Handle GSE Saves format (object with achievement names as keys)
      if (
        typeof data === "object" &&
        !Array.isArray(data) &&
        !data.achievements
      ) {
        console.log("Detected GSE Saves JSON format");

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
              console.log(
                `✅ Found recently earned achievement: ${achievementName} (${timeDiff}s ago)`
              );
              newlyUnlockedAchievements.push(achievementName);
            }
          }
        }
      }

      // Handle standard Goldberg JSON format (object with achievements property)
      if (data.achievements && typeof data.achievements === "object") {
        console.log("Detected standard Goldberg JSON format");

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
                console.log(
                  `✅ Found recently unlocked achievement: ${achievementName} (${timeDiff}s ago)`
                );
                newlyUnlockedAchievements.push(achievementName);
              }
            }
          }
        }
      }

      // If we found newly unlocked achievements, trigger notifications
      if (newlyUnlockedAchievements.length > 0) {
        console.log(
          `🎯 JSON State Change Detection: Found ${newlyUnlockedAchievements.length} newly unlocked achievements`
        );

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
      console.error("Error in JSON state change detection:", error);
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

    console.log(
      `📢 Handling notifications for ${achievementNamesArray.length} achievements`
    );

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
        console.log("No achievement data available in store");
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

      console.log(
        "Found matching achievements:",
        unlockedAchievements.map((a) => ({
          name: a?.name,
          displayName: a?.displayName,
          achievedAt: a?.achievedAt,
        }))
      );

      if (unlockedAchievements.length > 0) {
        console.log("🎉 NEW ACHIEVEMENTS UNLOCKED!");

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
          console.log("Attempting to play notification sound...");
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
        console.log("No newly unlocked achievements found");
      }
    } catch (error) {
      console.error("Error in notification handler:", error);
    }
  }

  function getGameBasedOnPath(path: string) {
    console.log("=== getGameBasedOnPath DEBUG ===");
    console.log("Input path:", path);
    console.log(
      "trackAchievementsFiles:",
      trackAchievementsFiles,
      getTrackedAchievementsFiles()
    );
    getTrackedAchievementsFiles().forEach((item, index) => {
      console.log(`[${index}] Stored path: "${item.filePath}"`);
      console.log(`[${index}] Input path:  "${path}"`);
      console.log(`[${index}] Paths match: ${item.filePath === path}`);
      console.log(`[${index}] AppId: ${item.appid}`);
    });
    const findEntry = getTrackedAchievementsFiles().find(
      (item) => item.filePath === path
    );
    console.log({ findEntry });

    const appid =
      getTrackedAchievementsFiles().find((item) => item.filePath === path)
        ?.appid ?? "";
    console.log("Found appid:", appid);

    if (!appid) {
      console.log("No appid found, returning false");
      return false;
    }
    const game = getGameById(String(appid));
    console.log("Found game:", game);

    return game ?? false;
  }

  return {};
};

export default useTrackingWorkflow;
