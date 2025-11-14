import { SteamSchemaResponse } from "@/types/achievements";
import { create } from "zustand";
interface AchievementsStore {
  achievements: SteamSchemaResponse[];
  addAchievement: (achievement: SteamSchemaResponse) => void;
  removeAchievement: (id: string) => void;
  getAchievementByName: (
    name: string,
    gameId: string
  ) => SteamSchemaResponse | undefined;
  updateAchievement: (id: number, data: Partial<SteamSchemaResponse>) => void;
  trackAchievementsFiles: { appid: number; filePath: string }[];
  resetAchievementsBasedOnAppid: (appid: number) => SteamSchemaResponse[];
  addTrackedFile: (
    appid: number,
    filePath: string
  ) => { appid: number; filePath: string }[];
  removeTrackedFile: (appid: number) => void;
  setTrackedAchievementsFiles: (
    files: { appid: number; filePath: string }[]
  ) => void;
  getTrackedAchievementsFiles: () => { appid: number; filePath: string }[];
  getAchievements: () => SteamSchemaResponse[];
}

const useAchievementsStore = create<AchievementsStore>((set, get) => {
  return {
    achievements: [],
    addAchievement: (achievement) => {
      set((state) => ({
        achievements: [...state.achievements, achievement],
      }));
    },

    removeAchievement: (id) =>
      set((state) => ({
        achievements: state.achievements.filter(
          (ach) => ach.game?.gameName !== id
        ),
      })),
    getAchievementByName: (name, gameId) => {
      return get().achievements.find(
        (ach) =>
          ach.game.gameName?.toLocaleLowerCase().trim() ===
            name.toLowerCase().trim() || Number(ach.gameId) === Number(gameId)
      );
    },
    updateAchievement: (id, data) => {
      set((state) => ({
        achievements: state.achievements.map((ach) =>
          Number(ach.gameId) === Number(id) ? { ...ach, ...data } : ach
        ),
      }));
    },
    resetAchievementsBasedOnAppid: (appid: number) => {
      set((state) => ({
        achievements: state.achievements.map((ach) => {
          if (Number(ach.gameId) === appid) {
            return {
              ...ach,
              game: {
                ...ach.game,
                availableGameStats: {
                  ...ach.game?.availableGameStats,
                  achievements: ach.game?.availableGameStats?.achievements?.map(
                    (a) => ({
                      ...a,
                      defaultvalue: 0,
                      achievedAt: "0",
                    })
                  ),
                },
              },
            };
          }
          return ach;
        }),
      }));
      return get().achievements;
    },
    trackAchievementsFiles: [],
    addTrackedFile: (appid, filePath) => {
      set((state) => ({
        trackAchievementsFiles: [
          ...state.trackAchievementsFiles,
          { appid, filePath },
        ],
      }));
      return get().trackAchievementsFiles;
    },

    removeTrackedFile: (appid) => {
      set((state) => ({
        trackAchievementsFiles: state.trackAchievementsFiles.filter(
          (file) => file.appid !== appid
        ),
      }));
    },
    setTrackedAchievementsFiles: (files) => {
      set(() => ({
        trackAchievementsFiles: files,
      }));
    },

    getTrackedAchievementsFiles: () => {
      return get().trackAchievementsFiles;
    },
    getAchievements: () => get().achievements,
  };
});

export default useAchievementsStore;
