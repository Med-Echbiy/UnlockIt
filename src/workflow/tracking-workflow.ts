import useAchievementsStore from "@/store/achievements-store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { SteamSchemaResponse } from "@/types/achievements";
import useMyGamesStore from "@/store/my-games-store";
import useParsingWorkflow from "./parser/parse-workflow";

const useTrackingWorkflow = () => {
  const { trackAchievementsFiles, achievements } = useAchievementsStore();
  const { games } = useMyGamesStore();
  const { parseAchievements } = useParsingWorkflow({
    exePath: "",
    appid: 0,
  });
  const [previousAchievement, setPreviousAchievement] = useState<
    SteamSchemaResponse[]
  >([]);
  useEffect(() => {
    setPreviousAchievement(achievements);
    const getPaths = trackAchievementsFiles.map((item) => item.filePath);

    console.log({ getPaths });
    if (getPaths.length > 0) {
      invoke("track_files", { paths: getPaths });
    }

    const unlisten = listen("file-change", (event) => {
      console.log("File change event received:", event);
      const game = getGameBasedOnPath(event.payload.path);
      if (game) {
        const { appId, exePath } = game;
        parseAchievements(appId, exePath).then((next) => {
          toast("New Event", {
            duration: 3000,
          });
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [trackAchievementsFiles]);

  function getGameBasedOnPath(path: string) {
    const appid =
      trackAchievementsFiles.find((item) => item.filePath === path)?.appid ??
      "";
    if (!appid) return false;
    const game = games.find((item) => item.appId === appid);
    console.log({ game });

    return game ?? false;
  }
  return {};
};

export default useTrackingWorkflow;
