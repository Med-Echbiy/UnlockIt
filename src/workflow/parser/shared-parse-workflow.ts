import { exists } from "@tauri-apps/plugin-fs";
import useInitialWorkflow from "../initial_workflow";
import useAchievementsStore from "@/store/achievements-store";

const sharedParsingWorkflow = () => {
  const { addTrackedFile, getTrackedAchievementsFiles } =
    useAchievementsStore();
  const { trackedAchievementsFilesStore } = useInitialWorkflow();
  const checkExePath = async (exePath: string) => {
    const check = await exists(exePath);
    return check;
  };
  async function saveToTrackList(appid: number, filePath: string) {
    const check_exists = getTrackedAchievementsFiles().find(
      (e) => e.filePath === filePath
    );
    if (check_exists) {
      return;
    }
    const trackedFiles = addTrackedFile(appid, filePath);
    await trackedAchievementsFilesStore?.set(
      "trackedAchievementsFiles",
      trackedFiles
    );
    await trackedAchievementsFilesStore?.save();
  }
  return { checkExePath, saveToTrackList };
};

export default sharedParsingWorkflow;
