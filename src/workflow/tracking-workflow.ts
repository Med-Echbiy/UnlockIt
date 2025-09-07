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
    const pathsString = JSON.stringify(getPaths.sort()); // Sort for consistent comparison

    console.log({ getPaths });
    console.log("getPaths length:", getPaths.length);
    console.log("Current paths string:", pathsString);
    console.log("Previous paths string:", currentPaths.current);
    console.log("Is watcher already setup:", isWatcherSetup.current);
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
          console.log("No new lines added, skipping achievement check");
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
