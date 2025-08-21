import useAchievementsStore from "@/store/achievments-store";
import useMyGamesStore from "@/store/my-games-store";
import { SteamSchemaResponse } from "@/types/achievements";
import { GameStoreData } from "@/types/Game";
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";

const useInitialWorkflow = () => {
  const { addGame } = useMyGamesStore();
  const { addAchievement } = useAchievementsStore();
  useEffect(() => {
    (async () => {
      const [store, achievements_store] = await Promise.all([
        load("my-games.json"),
        load("achievements.json"),
      ]);
      // store.clear();
      // achievements_store.clear();
      const [data, data_achievement] = await Promise.all([
        store.entries(),
        achievements_store.entries(),
      ]);
      const obj = Object.fromEntries(data);
      const objAchievements = Object.fromEntries(data_achievement);
      console.log({ obj, objAchievements });

      for (const [key, value] of Object.entries(obj)) {
        addGame(value as GameStoreData);
      }
      for (const [key, value] of Object.entries(objAchievements)) {
        console.log({ key, value });
        addAchievement(value as SteamSchemaResponse);
      }
    })();
  }, []);

  return {};
};

export default useInitialWorkflow;
