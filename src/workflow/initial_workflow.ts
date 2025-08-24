import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import { SteamSchemaResponse } from "@/types/achievements";
import { GameStoreData } from "@/types/Game";
import { load, Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";

const useInitialWorkflow = () => {
  const { addGame } = useMyGamesStore();
  const { addAchievement, setTrackedAchievementsFiles } =
    useAchievementsStore();
  //
  const [myGamesStore, setMyGames] = useState<Store | null>(null);
  const [achievementsStore, setAchievements] = useState<Store | null>(null);
  const [trackedAchievementsFilesStore, setTrackedAchievementsFilesState] =
    useState<Store | null>(null);
  useEffect(() => {
    (async () => {
      const [store, achievements_store, tracked_files_store] =
        await Promise.all([
          load("my-games.json"),
          load("achievements.json"),
          load("trackedAchievementsFiles.json"),
        ]);
      setMyGames(store);
      setAchievements(achievements_store);
      setTrackedAchievementsFilesState(tracked_files_store);
      // store.clear();
      // achievements_store.clear();
      // tracked_files_store.clear();
      const [data, data_achievement] = await Promise.all([
        store.entries(),
        achievements_store.entries(),
      ]);
      const obj = Object.fromEntries(data);
      const objAchievements = Object.fromEntries(data_achievement);
      console.log({ obj, objAchievements });

      for (const [, value] of Object.entries(obj)) {
        addGame(value as GameStoreData);
      }
      for (const [key, value] of Object.entries(objAchievements)) {
        console.log({ key, value });
        addAchievement(value as SteamSchemaResponse);
      }
      //
      const trackedList: { appid: number; filePath: string }[] =
        (await tracked_files_store.get("trackedAchievementsFiles")) || [];
      setTrackedAchievementsFiles(trackedList);
    })();
  }, []);

  return {
    myGamesStore,
    achievementsStore,
    trackedAchievementsFilesStore,
  };
};

export default useInitialWorkflow;
