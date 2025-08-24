import { Achievement, SteamSchemaResponse } from "@/types/achievements";
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
}

const useAchievementsStore = create<AchievementsStore>((set, get) => ({
  achievements: [],
  addAchievement: (achievement) => {
    console.log({ achievement });
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
    console.log(
      "getAchievementByName",
      gameId,
      name,
      get().achievements,
      get().achievements.find(
        (ach) =>
          ach.game.gameName?.toLocaleLowerCase().trim() ===
            name.toLowerCase().trim() || Number(ach.gameId) === Number(gameId)
      )
    );
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
    })),
      console.log("Updated Achievement:", {
        data,
        id,
        existing: get().achievements.find(
          (ach) => Number(ach.gameId) === Number(id)
        ),
      });
  },
}));

export default useAchievementsStore;
