import { GameStoreData } from "@/types/Game";
import { create } from "zustand";

interface MyGamesStore {
  games: GameStoreData[];
  addGame: (game: GameStoreData) => void;
  removeGame: (appId: string) => void;
  getGameById: (appId: string) => GameStoreData | undefined;
  setStatus: (appId: string, status: GameStoreData["status"]) => void;
  setRating: (appId: string, rating: string) => void;
  setPlaytime: (appId: string, playtime: number) => void;
  setHeaderImage: (appId: string, headerImage: string) => void;
  setLibraryCover: (appId: string, libraryCover: string) => void;
  updateExePath: (appId: string, exePath: string, dir: string) => void;
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
  setPlaytime: (appId, playtime) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId ? { ...game, playtime } : game
      ),
    })),
  setHeaderImage: (appId, headerImage) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId
          ? { ...game, header_image: headerImage }
          : game
      ),
    })),
  setLibraryCover: (appId, libraryCover) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId
          ? { ...game, library_cover: libraryCover }
          : game
      ),
    })),
  updateExePath: (appId, exePath, dir) =>
    set((state) => ({
      games: state.games.map((game) =>
        String(game.appId) === appId ? { ...game, exePath, dir } : game
      ),
    })),
  getGames: () => get().games,
}));

export default useMyGamesStore;
