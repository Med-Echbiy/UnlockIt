import { GameStoreData } from "@/types/Game";
import useMyGamesStore from "@/store/my-games-store";
import { load } from "@tauri-apps/plugin-store";

const useUpdateGameWorkflow = () => {
  const {
    setStatus: setStoreStatus,
    setRating: setStoreRating,
    setPlaytime: setStorePlaytime,
  } = useMyGamesStore();

  const setGameStatus = async (
    appId: string,
    status: GameStoreData["status"]
  ) => {
    setStoreStatus(appId, status);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, status };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
    }
  };

  const setGameRating = async (appId: string, rating: string) => {
    setStoreRating(appId, rating);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, my_rating: rating };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
    }
  };

  const setGamePlaytime = async (appId: string, playtime: number) => {
    setStorePlaytime(appId, playtime);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, playtime };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
    }
  };

  return {
    setGameStatus,
    setGameRating,
    setGamePlaytime,
  };
};

export default useUpdateGameWorkflow;
