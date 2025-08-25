import useAchievementsStore from "@/store/achievements-store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

const useTrackingWorkflow = () => {
  const { trackAchievementsFiles } = useAchievementsStore();

  useEffect(() => {
    const getPaths = trackAchievementsFiles.map((item) => item.filePath);
    if (getPaths.length > 0) {
      invoke("track_files", { paths: getPaths });
    }

    const unlisten = listen("file-change", (event) => {});

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [trackAchievementsFiles]);

  return {};
};

export default useTrackingWorkflow;
