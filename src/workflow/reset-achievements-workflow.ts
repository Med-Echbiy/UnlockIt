import useAchievementsStore from "@/store/achievements-store";
import { writeFile } from "@tauri-apps/plugin-fs";
import useInitialWorkflow from "./initial_workflow";

const useResetAchievementsWorkflow = (appid: number) => {
  const {
    trackAchievementsFiles,
    setTrackedAchievementsFiles,
    resetAchievementsBasedOnAppid,
  } = useAchievementsStore();
  const { achievementsStore } = useInitialWorkflow();
  // Your implementation here
  const resetAchievements = async () => {
    // Call your API or perform the reset logic here

    const filteredFiles = trackAchievementsFiles.filter(
      (file) => Number(file.appid) === Number(appid)
    );
    const filesNotEffected = trackAchievementsFiles.filter(
      (file) => Number(file.appid) !== Number(appid)
    );

    for (let index = 0; index < filteredFiles.length; index++) {
      const file = filteredFiles[index].filePath;

      await writeFile(file, new TextEncoder().encode(""));
    }
    const BulkUpdate = resetAchievementsBasedOnAppid(appid);
    setTrackedAchievementsFiles(filesNotEffected);

    // Find the updated achievement data more safely
    const updatedAchievementData = BulkUpdate.find(
      (e) => Number(e.gameId) === Number(appid)
    );
    if (updatedAchievementData && achievementsStore) {
      await achievementsStore.set(
        `achievements_${appid}`,
        updatedAchievementData
      );
      await achievementsStore.save();
    }
    // ...existing code...
    // reset achievements store
  };

  return {
    resetAchievements,
  };
};

export default useResetAchievementsWorkflow;
