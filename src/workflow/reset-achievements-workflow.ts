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
    console.log("Resetting achievements for appid:", appid);
    const filteredFiles = trackAchievementsFiles.filter(
      (file) => Number(file.appid) === Number(appid)
    );
    const filesNotEffected = trackAchievementsFiles.filter(
      (file) => Number(file.appid) !== Number(appid)
    );
    console.log("Filtered tracked files:", filteredFiles, filesNotEffected);
    for (let index = 0; index < filteredFiles.length; index++) {
      const file = filteredFiles[index].filePath;
      console.log("Resetting achievements for file:", file);
      await writeFile(file, new TextEncoder().encode(""));
    }
    const BulkUpdate = resetAchievementsBasedOnAppid(appid);
    setTrackedAchievementsFiles(filesNotEffected);
    await achievementsStore?.set(
      `achievements_${appid}`,
      BulkUpdate.find((e) => e.gameId === appid)
    );
    // console.log({ Get: await achievementsStore?.get(`achievements_${appid}`) });
    // reset achievements store
  };

  return {
    resetAchievements,
  };
};

export default useResetAchievementsWorkflow;
