import useAchievementsStore from "@/store/achievements-store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import useMyGamesStore from "@/store/my-games-store";
import useParsingWorkflow from "./parser/parse-workflow";
import { toast } from "sonner";
import useProfileStore from "@/store/profile-store";

const useTrackingWorkflow = () => {
  const { trackAchievementsFiles, getTrackedAchievementsFiles } =
    useAchievementsStore();
  const { getGameById } = useMyGamesStore();
  const { parseAchievements } = useParsingWorkflow({
    exePath: "",
    appid: 0,
  });
  const { getProfile } = useProfileStore();
  const isWatcherSetup = useRef(false);
  const currentPaths = useRef<string>("");
  const eventListenerSetup = useRef(false);

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
                achievementNames.add(achievementName);
                console.log("Added achievement to set:", achievementName);
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
                    .filter(Boolean); // Remove undefined entries

                  console.log(
                    "Found matching achievements:",
                    unlockedAchievements.map((a) => ({
                      name: a?.name,
                      displayName: a?.displayName,
                    }))
                  );

                  if (unlockedAchievements.length > 0) {
                    console.log("🎉 NEW ACHIEVEMENTS UNLOCKED!");
                    toast(
                      `${unlockedAchievements.length} new achievements unlocked!`,
                      {
                        duration: 3000,
                        style: {
                          backgroundColor: "#a21caf", // tailwindcss purple-500
                        },
                      }
                    );
                    for (const achievement of unlockedAchievements) {
                      if (achievement) {
                        console.log(
                          "Showing native notification for achievement:",
                          achievement.displayName || achievement.name
                        );

                        try {
                          const audio = new Audio(
                            getProfile().notificationSound
                          ); // Ensure valid path
                          audio.volume = 1; // Adjust volume as needed
                          audio
                            .play()
                            .catch((err) =>
                              console.warn("Failed to play custom sound:", err)
                            );
                          await invoke("toast_notification", {
                            iconPath: achievement.icon || "",
                            gameName: game.name,
                            achievementName:
                              achievement.displayName || achievement.name,
                            soundPath: null,
                            hero: game.header_image || "",
                            progress: null, // Could be enhanced to show actual progress if available
                            isRare: false, // Could be enhanced to detect rare achievements
                          });
                        } catch (error) {
                          console.error("Failed to send notification:", error);
                        }
                      }
                    }
                  } else {
                    console.log("No matching achievements found in game data");
                  }
                } else {
                  console.log("No achievement data available in store");
                }
              })
              .catch((error) => {
                console.error("Error parsing achievements:", error);
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
    };
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
