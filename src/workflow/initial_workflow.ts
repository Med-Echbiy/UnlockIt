import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import useHowLongToBeatStore from "@/store/how-long-to-beat-store";
import { SteamSchemaResponse } from "@/types/achievements";
import { GameStoreData } from "@/types/Game";
import { HowLongToBeatGame } from "@/types/howLongToBeat";
import { load, Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";

const useInitialWorkflow = () => {
  const { addGame } = useMyGamesStore();
  const { addAchievement, setTrackedAchievementsFiles } =
    useAchievementsStore();
  const { addHowLongToBeatData } = useHowLongToBeatStore();

  //
  const [myGamesStore, setMyGames] = useState<Store | null>(null);
  const [achievementsStore, setAchievements] = useState<Store | null>(null);
  const [howLongToBeatStore, setHowLongToBeatStore] = useState<Store | null>(
    null
  );
  const [trackedAchievementsFilesStore, setTrackedAchievementsFilesState] =
    useState<Store | null>(null);
  useEffect(() => {
    (async () => {
      const [
        store,
        achievements_store,
        howLongToBeat_store,
        tracked_files_store,
      ] = await Promise.all([
        load("my-games.json"),
        load("achievements.json"),
        load("howlongtobeat.json"),
        load("trackedAchievementsFiles.json"),
      ]);
      setMyGames(store);
      setAchievements(achievements_store);
      setHowLongToBeatStore(howLongToBeat_store);
      setTrackedAchievementsFilesState(tracked_files_store);

      // Uncomment to clear stores if needed
      // store.clear();
      // achievements_store.clear();
      // howLongToBeat_store.clear();
      // tracked_files_store.clear();

      const [data, data_achievement, data_howLongToBeat] = await Promise.all([
        store.entries(),
        achievements_store.entries(),
        howLongToBeat_store.entries(),
      ]);

      const obj = Object.fromEntries(data);
      const objAchievements = Object.fromEntries(data_achievement);
      const objHowLongToBeat = Object.fromEntries(data_howLongToBeat);

      // Load games
      for (const [, value] of Object.entries(obj)) {
        addGame(value as GameStoreData);
      }

      // Load achievements
      for (const [_key, value] of Object.entries(objAchievements)) {
        addAchievement(value as SteamSchemaResponse);
      }

      // Load HowLongToBeat data
      for (const [key, value] of Object.entries(objHowLongToBeat)) {
        // The key format should be "appId_beatTime", so extract the appId
        const appId = key.replace("_beatTime", "");
        addHowLongToBeatData(appId, value as HowLongToBeatGame);
      }

      // Load tracked achievements files
      const trackedList: { appid: number; filePath: string }[] =
        (await tracked_files_store.get("trackedAchievementsFiles")) || [];
      setTrackedAchievementsFiles(trackedList);
    })();
  }, [
    addGame,
    addAchievement,
    addHowLongToBeatData,
    setTrackedAchievementsFiles,
  ]);

  return {
    myGamesStore,
    achievementsStore,
    howLongToBeatStore,
    trackedAchievementsFilesStore,
  };
};

export default useInitialWorkflow;
