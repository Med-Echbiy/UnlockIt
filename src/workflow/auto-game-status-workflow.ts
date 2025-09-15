import { invoke } from "@tauri-apps/api/core";
import useMyGamesStore from "@/store/my-games-store";
import useAchievementsStore from "@/store/achievements-store";
import useUpdateGameWorkflow from "./update-game-workflow";
import { Achievement } from "@/types/achievements";

const useAutoGameStatusWorkflow = () => {
  const { getGameById } = useMyGamesStore();
  const { getAchievementByName } = useAchievementsStore();
  const { setGameStatus } = useUpdateGameWorkflow();

  const checkAndUpdateGameStatus = async (appId: string) => {
    try {
      const game = getGameById(appId);
      if (!game || game.status !== "not-played") {
        // Only auto-update if game is currently "not-played"
        return;
      }

      // Check playtime (both tracked and manual)
      let hasPlaytime = false;

      // Check Tauri tracked playtime
      try {
        const tauriPlaytime = await invoke<number>("get_current_playtime", {
          appid: appId,
        });
        if (tauriPlaytime > 0) {
          hasPlaytime = true;
        }
      } catch (e) {
        console.log("No Tauri playtime data found");
      }

      // Check manual playtime
      if (game.playtime && game.playtime > 0) {
        hasPlaytime = true;
      }

      // Check for unlocked achievements
      const achievements = getAchievementByName("", appId);
      const hasUnlockedAchievements =
        achievements?.game?.availableGameStats?.achievements?.some(
          (ach: Achievement) => ach.achievedAt !== "0" && ach.defaultvalue === 1
        ) || false;

      // Auto-update status to "played" if there's playtime or unlocked achievements
      if (hasPlaytime || hasUnlockedAchievements) {
        console.log(
          `Auto-updating game ${appId} status to "played" - hasPlaytime: ${hasPlaytime}, hasAchievements: ${hasUnlockedAchievements}`
        );
        await setGameStatus(appId, "played");
      }
    } catch (error) {
      console.error("Failed to check and update game status:", error);
    }
  };

  return {
    checkAndUpdateGameStatus,
  };
};

export default useAutoGameStatusWorkflow;
