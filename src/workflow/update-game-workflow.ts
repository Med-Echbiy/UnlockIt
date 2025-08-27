import { GameStoreData } from "@/types/Game";
import useMyGamesStore from "@/store/my-games-store";
import { load } from "@tauri-apps/plugin-store";

const useUpdateGameWorkflow = () => {
  const { setStatus: setStoreStatus, setRating: setStoreRating } =
    useMyGamesStore();

  const setGameStatus = async (
    appId: string,
    status: GameStoreData["status"]
  ) => {
    // Update Zustand store
    setStoreStatus(appId, status);

    // Update Tauri store
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
      console.error("Failed to update game status in Tauri store:", error);
    }
  };

  const setGameRating = async (appId: string, rating: string) => {
    // Update Zustand store
    setStoreRating(appId, rating);

    // Update Tauri store
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
      console.error("Failed to update game rating in Tauri store:", error);
    }
  };

  return {
    setGameStatus,
    setGameRating,
  };
};

export default useUpdateGameWorkflow;
