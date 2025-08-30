import { GameStoreData } from "@/types/Game";
import { create } from "zustand";

interface MyGamesStore {
  games: GameStoreData[];
  addGame: (game: GameStoreData) => void;
  removeGame: (appId: string) => void;
  getGameById: (appId: string) => GameStoreData | undefined;
  setStatus: (appId: string, status: GameStoreData["status"]) => void;
  setRating: (appId: string, rating: string) => void;
  getGames: () => GameStoreData[];
}

const useMyGamesStore = create<MyGamesStore>((set, get) => ({
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
  getGameById: (appId) => {
    return get().games.find((game) => String(game.appId) === appId);
  },
  setStatus: (appId, status) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId ? { ...game, status } : game
      ),
    })),
  setRating: (appId, rating) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId ? { ...game, my_rating: rating } : game
      ),
    })),
  getGames: () => get().games,
}));

export default useMyGamesStore;
