import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import useMyGamesStore from "@/store/my-games-store";
import useAchievementsStore from "@/store/achievements-store";
import useRequiredDataStore from "@/store/required-data-store";
import { Achievement, SteamSchemaResponse } from "@/types/achievements";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";

const useSilentPercentageRefreshWorkflow = () => {
  const { getGames } = useMyGamesStore();
  const { getAchievements, updateAchievement } = useAchievementsStore();
  const { getSteamApiKey } = useRequiredDataStore();

  const isRefreshing = useRef(false);
  const refreshStore = useRef<any>(null);

  // Throttle refreshes to max once per day
  // NOTE: This cooldown ONLY applies to Steam API percentage fetching,
  // NOT to local achievement file checking/parsing which can happen anytime
  const REFRESH_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours (1 day)

  // Initialize the persistent store for refresh timestamps
  useEffect(() => {
    const initStore = async () => {
      try {
        refreshStore.current = await load("refresh-timestamps.json");
      } catch (error) {
        console.error("Failed to load refresh timestamps store:", error);
      }
    };
    initStore();
  }, []);

  // Get last refresh timestamp from persistent storage
  const getLastRefreshTime = async (): Promise<number> => {
    try {
      if (!refreshStore.current) return 0;
      const timestamp = await refreshStore.current.get("lastPercentageRefresh");
      return timestamp || 0;
    } catch (error) {
      console.error("Failed to get last refresh time:", error);
      return 0;
    }
  };

  // Set last refresh timestamp in persistent storage
  const setLastRefreshTime = async (timestamp: number): Promise<void> => {
    try {
      if (!refreshStore.current) return;
      await refreshStore.current.set("lastPercentageRefresh", timestamp);
      await refreshStore.current.save();
    } catch (error) {
      console.error("Failed to set last refresh time:", error);
    }
  };

  const refreshAchievementPercentages = async () => {
    const now = Date.now();
    const lastRefreshTime = await getLastRefreshTime();

    // Prevent multiple simultaneous refreshes and respect cooldown
    if (isRefreshing.current || now - lastRefreshTime < REFRESH_COOLDOWN) {
      const timeRemaining = REFRESH_COOLDOWN - (now - lastRefreshTime);
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
      console.log(
        `🔄 Percentage refresh skipped - cooldown active (${hoursRemaining}h remaining) or already refreshing`
      );
      return;
    }

    const apiKey = getSteamApiKey();
    if (!apiKey) {
      console.log("🔄 Percentage refresh skipped - no Steam API key");
      return;
    }

    const games = getGames();
    const achievements = getAchievements();

    if (games.length === 0 || achievements.length === 0) {
      console.log("🔄 Percentage refresh skipped - no games or achievements");
      return;
    }

    isRefreshing.current = true;
    await setLastRefreshTime(now);

    console.log(
      "🔄 Starting silent achievement percentage refresh for",
      games.length,
      "games"
    );

    try {
      const refreshPromises = games.map(async (game) => {
        try {
          // Find corresponding achievements for this game
          const gameAchievements = achievements.find(
            (a) => Number(a.gameId) === game.appId
          );
          if (!gameAchievements?.game?.availableGameStats?.achievements) {
            return;
          }

          // Fetch updated percentages from Steam
          const percentagesResult = await Promise.race([
            invoke("fetch_steam_achievement_percentages", {
              appid: game.appId.toString(),
            }) as Promise<any>,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 8000)
            ),
          ]);

          if (percentagesResult?.achievementpercentages?.achievements) {
            // Create percentage map for O(1) lookup
            const percentageMap = new Map<string, string>(
              percentagesResult.achievementpercentages.achievements.map(
                (item: any) => [item.name, String(item.percent)]
              )
            );

            // Update achievements with new percentages
            const updatedAchievements =
              gameAchievements.game.availableGameStats.achievements.map(
                (achievement: Achievement) => ({
                  ...achievement,
                  percent:
                    percentageMap.get(achievement.name) ||
                    achievement.percent ||
                    "0",
                })
              );

            // Build updated data structure
            const updatedData: SteamSchemaResponse = {
              ...gameAchievements,
              game: {
                ...gameAchievements.game,
                availableGameStats: {
                  ...gameAchievements.game.availableGameStats,
                  achievements: updatedAchievements,
                },
              },
            };

            // Update both store and file
            updateAchievement(game.appId, updatedData);

            // Update file silently
            const dir = await appLocalDataDir();
            const filePath = await join(
              dir,
              "achievements",
              `achievements_${game.appId}.json`
            );
            await writeFile(
              filePath,
              new TextEncoder().encode(JSON.stringify(updatedData, null, 2))
            );

            console.log(`✅ Updated percentages for ${game.name}`);
          }
        } catch (error) {
          // Silently handle individual game failures
          console.warn(
            `⚠️ Failed to update percentages for ${game.name}:`,
            error
          );
        }
      });

      // Process all games in parallel with a reasonable limit
      const BATCH_SIZE = 5;
      for (let i = 0; i < refreshPromises.length; i += BATCH_SIZE) {
        const batch = refreshPromises.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch);

        // Small delay between batches to avoid overwhelming Steam API
        if (i + BATCH_SIZE < refreshPromises.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log("✅ Silent achievement percentage refresh completed");
    } catch (error) {
      console.error("❌ Silent percentage refresh failed:", error);
    } finally {
      isRefreshing.current = false;
    }
  };

  const handleOnlineStatusChange = (isOnline: boolean) => {
    if (isOnline) {
      console.log("🌐 User came online - scheduling percentage refresh");
      // Delay refresh slightly to ensure connection is stable
      setTimeout(() => {
        refreshAchievementPercentages();
      }, 2000);
    }
  };

  // Set up online/offline event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => handleOnlineStatusChange(true);

    window.addEventListener("online", onOnline);

    // Also check if we're already online on mount
    if (navigator.onLine) {
      // Only refresh if it's been a while since last refresh
      setTimeout(async () => {
        const lastRefreshTime = await getLastRefreshTime();
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        if (timeSinceLastRefresh > REFRESH_COOLDOWN) {
          refreshAchievementPercentages();
        }
      }, 5000); // 5 second delay on startup
    }

    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Manual refresh function (ignores cooldown)
  const manualRefreshPercentages = async () => {
    await setLastRefreshTime(0); // Reset cooldown for manual refresh
    await refreshAchievementPercentages();
  };

  // Check if refresh is available (not in cooldown)
  const canRefresh = async (): Promise<{
    canRefresh: boolean;
    timeRemaining?: number;
  }> => {
    const lastRefreshTime = await getLastRefreshTime();
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;

    if (timeSinceLastRefresh >= REFRESH_COOLDOWN) {
      return { canRefresh: true };
    } else {
      return {
        canRefresh: false,
        timeRemaining: REFRESH_COOLDOWN - timeSinceLastRefresh,
      };
    }
  };

  return {
    refreshAchievementPercentages,
    manualRefreshPercentages,
    canRefresh,
    isRefreshing: () => isRefreshing.current,
  };
};

export default useSilentPercentageRefreshWorkflow;
