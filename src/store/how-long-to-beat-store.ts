import { HowLongToBeatGame } from "@/types/howLongToBeat";
import { create } from "zustand";

interface HowLongToBeatStore {
  howLongToBeatData: Record<string, HowLongToBeatGame>; // appId -> HowLongToBeatGame
  addHowLongToBeatData: (appId: string, data: HowLongToBeatGame) => void;
  removeHowLongToBeatData: (appId: string) => void;
  getHowLongToBeatDataById: (appId: string) => HowLongToBeatGame | undefined;
  updateHowLongToBeatData: (appId: string, data: HowLongToBeatGame) => void;
  clearAllHowLongToBeatData: () => void;
  hasHowLongToBeatData: (appId: string) => boolean;
}

const useHowLongToBeatStore = create<HowLongToBeatStore>((set, get) => ({
  howLongToBeatData: {},

  addHowLongToBeatData: (appId, data) =>
    set((state) => ({
      howLongToBeatData: {
        ...state.howLongToBeatData,
        [appId]: data,
      },
    })),

  removeHowLongToBeatData: (appId) =>
    set((state) => {
      const { [appId]: removed, ...rest } = state.howLongToBeatData;
      return { howLongToBeatData: rest };
    }),

  getHowLongToBeatDataById: (appId) => {
    return get().howLongToBeatData[appId];
  },

  updateHowLongToBeatData: (appId, data) =>
    set((state) => ({
      howLongToBeatData: {
        ...state.howLongToBeatData,
        [appId]: data,
      },
    })),

  clearAllHowLongToBeatData: () => set({ howLongToBeatData: {} }),

  hasHowLongToBeatData: (appId) => {
    return appId in get().howLongToBeatData;
  },
}));

export default useHowLongToBeatStore;
