import useAchievementsStore from "@/store/achievements-store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { SteamSchemaResponse } from "@/types/achievements";
import useMyGamesStore from "@/store/my-games-store";
import useParsingWorkflow from "./parser/parse-workflow";
import { toast } from "sonner";

const useTrackingWorkflow = () => {
  const { trackAchievementsFiles, achievements, getTrackedAchievementsFiles } =
    useAchievementsStore();
  const { getGameById } = useMyGamesStore();
  const { parseAchievements } = useParsingWorkflow({
    exePath: "",
    appid: 0,
  });
  const [previousAchievement, setPreviousAchievement] = useState<
    SteamSchemaResponse[]
  >([]);

  // Use refs to prevent multiple registrations
  const isWatcherSetup = useRef(false);
  const currentPaths = useRef<string>("");

  useEffect(() => {
    console.log("TrackingWorkflow useEffect triggered");
    console.log("trackAchievementsFiles:", trackAchievementsFiles);

    // Set previous achievements at the start to ensure we have a baseline for comparison
    if (previousAchievement.length === 0 && achievements.length > 0) {
      console.log("Setting initial previous achievements state");
      setPreviousAchievement([...achievements]); // Create a deep copy
    }

    const getPaths = trackAchievementsFiles.map((item) => item.filePath);
    const pathsString = JSON.stringify(getPaths.sort()); // Sort for consistent comparison

    console.log({ getPaths });
    console.log("getPaths length:", getPaths.length);
    console.log("Current paths string:", pathsString);
    console.log("Previous paths string:", currentPaths.current);
    console.log("Is watcher already setup:", isWatcherSetup.current);

    // Only setup watcher if paths changed or watcher isn't setup
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
  }, [trackAchievementsFiles.length, achievements.length]); // Add achievements.length to dependency

  // Separate effect for setting up the event listener (only once)
  useEffect(() => {
    console.log("Setting up file-change event listener...");

    const unlisten = listen("file-change", (event) => {
      console.log("=== FILE CHANGE EVENT RECEIVED ===");
      console.log("Full event object:", event);
      console.log("Event payload:", event.payload);

      // Type the event payload
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

        // Only process if there are actually added lines to avoid empty notifications
        if (payload.added_lines && payload.added_lines.length > 0) {
          console.log("Processing achievement changes for game:", game.name);
          console.log("Added lines:", payload.added_lines);

          // Parse achievements - this function returns void but updates the store
          parseAchievements(appId, exePath)
            .then(async () => {
              // Wait a bit for the store to update
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Get the current achievements from the store after parsing
              const { achievements: updatedAchievements } =
                useAchievementsStore.getState();
              const currentAchievements = updatedAchievements.find(
                (ach) => Number(ach.gameId) === Number(appId)
              );
              const previousAch = previousAchievement.find(
                (ach) => Number(ach.gameId) === Number(appId)
              );

              if (currentAchievements && previousAch) {
                const currentUnlocked =
                  currentAchievements.game?.availableGameStats?.achievements?.filter(
                    (a) => a.defaultvalue === 1
                  ) || [];
                const previousUnlocked =
                  previousAch.game?.availableGameStats?.achievements?.filter(
                    (a) => a.defaultvalue === 1
                  ) || [];

                // Find newly unlocked achievements
                const newlyUnlocked = currentUnlocked.filter(
                  (current) =>
                    !previousUnlocked.some((prev) => prev.name === current.name)
                );
                console.log({
                  newlyUnlocked,
                  currentUnlocked: currentUnlocked.length,
                  previousUnlocked: previousUnlocked.length,
                });

                if (newlyUnlocked.length > 0) {
                  toast(`${newlyUnlocked.length} new achievements unlocked!`);

                  // Show notification for each newly unlocked achievement
                  for (const achievement of newlyUnlocked) {
                    await invoke("toast_notification", {
                      iconPath:
                        game.header_image ||
                        game.capsule_image ||
                        "path/to/default/icon.png",
                      gameName: game.name || "Unknown Game",
                      achievementName:
                        achievement.displayName ||
                        achievement.name ||
                        "Unknown Achievement",
                      soundPath: "xbox-rare.mp3", // optional
                    });
                  }
                }
              }

              // Update previous achievements with current state - use a deep copy
              setPreviousAchievement([
                ...useAchievementsStore.getState().achievements,
              ]);
            })
            .catch((error) => {
              console.error("Error parsing achievements:", error);
            });
        } else {
          console.log("No new lines added, skipping achievement check");
        }
      }
    });

    return () => {
      console.log(
        "Event listener cleanup - unregistering file-change listener"
      );
      unlisten.then((fn) => fn());
    };
  }, []); // Empty dependency array - setup listener only once

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      console.log("TrackingWorkflow component unmounting - cleaning up");
      isWatcherSetup.current = false;
      currentPaths.current = "";
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

    // Show each file path comparison
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
