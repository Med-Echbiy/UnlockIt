import { Achievement, SteamSchemaResponse } from "@/types/achievements";
import { create } from "zustand";
interface AchievementsStore {
  achievements: SteamSchemaResponse[];
  addAchievement: (achievement: SteamSchemaResponse) => void;
  removeAchievement: (id: string) => void;
}

const useAchievementsStore = create<AchievementsStore>((set) => ({
  achievements: [],
  addAchievement: (achievement) =>
    set((state) => ({
      achievements: [...state.achievements, achievement],
    })),
  removeAchievement: (id) =>
    set((state) => ({
      achievements: state.achievements.filter(
        (ach) => ach.game?.gameName !== id
      ),
    })),
}));

export default useAchievementsStore;
