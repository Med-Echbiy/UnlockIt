import { GameStoreData } from "@/types/Game";
import { create } from "zustand";

interface MyGamesStore {
  games: GameStoreData[];
  addGame: (game: GameStoreData) => void;
  removeGame: (appId: string) => void;
}

const useMyGamesStore = create<MyGamesStore>((set) => ({
  games: [],
  addGame: (game) =>
    set((state) => {
      const checkForDuplicates = state.games.some(
        (g) => g.appId === game.appId
      );
      if (!checkForDuplicates) {
        return { games: [...state.games, game] };
      }
      return state;
    }),
  removeGame: (appId) =>
    set((state) => ({
      games: state.games.filter((game) => String(game.appId) !== appId),
    })),
}));

export default useMyGamesStore;
