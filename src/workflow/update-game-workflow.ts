import { GameStoreData } from "@/types/Game";
import useMyGamesStore from "@/store/my-games-store";
import { load } from "@tauri-apps/plugin-store";

const useUpdateGameWorkflow = () => {
  const {
    setStatus: setStoreStatus,
    setRating: setStoreRating,
    setPlaytime: setStorePlaytime,
    setHeaderImage: setStoreHeaderImage,
    setLibraryCover: setStoreLibraryCover,
    updateExePath: updateStoreExePath,
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
    } catch (error) {}
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
    } catch (error) {}
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
    } catch (error) {}
  };

  const setGameHeaderImage = async (appId: string, headerImage: string) => {
    setStoreHeaderImage(appId, headerImage);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, header_image: headerImage };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
      console.error("Failed to save header image:", error);
    }
  };

  const setGameLibraryCover = async (appId: string, libraryCover: string) => {
    setStoreLibraryCover(appId, libraryCover);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, library_cover: libraryCover };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
      console.error("Failed to save library cover:", error);
    }
  };

  const setGameExePath = async (
    appId: string,
    exePath: string,
    dir: string
  ) => {
    updateStoreExePath(appId, exePath, dir);
    try {
      const store = await load("my-games.json");
      const gameKey = `game_${appId}`;
      const gameData = (await store.get(gameKey)) as GameStoreData;

      if (gameData) {
        const updatedGame = { ...gameData, exePath, dir };
        await store.set(gameKey, updatedGame);
        await store.save();
      }
    } catch (error) {
      console.error("Failed to save exe path:", error);
    }
  };

  return {
    setGameStatus,
    setGameRating,
    setGamePlaytime,
    setGameHeaderImage,
    setGameLibraryCover,
    setGameExePath,
  };
};

export default useUpdateGameWorkflow;
