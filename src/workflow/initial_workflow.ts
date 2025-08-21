import useMyGamesStore from "@/store/my-games-store";
import { GameStoreData } from "@/types/Game";
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";

const useInitialWorkflow = () => {
  const { addGame } = useMyGamesStore();
  useEffect(() => {
    (async () => {
      const store = await load("my-games.json");
      // store.clear();
      const data = await store.entries();
      const obj = Object.fromEntries(data);
      console.log({ obj, data });

      for (const [key, value] of Object.entries(obj)) {
        addGame(value as GameStoreData);
      }
    })();
  }, []);

  return {};
};

export default useInitialWorkflow;
