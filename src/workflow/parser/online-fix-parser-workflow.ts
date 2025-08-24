import useAchievementsStore from "@/store/achievements-store";
import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import useInitialWorkflow from "../initial_workflow";
import sharedParsingWorkflow from "./shared-parse-workflow";
const useOnlineFixParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();
  // Your implementation here
  async function getTheOnlineFixFolder() {
    try {
      const publicPath = await path.publicDir();
      console.log({ publicPath });
      return path.join(publicPath, "Documents", "OnlineFix", appid.toString());
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  async function parseOnlineFixFolder() {
    try {
      const onlineFixFolder = await getTheOnlineFixFolder();
      console.log({ onlineFixFolder });
      if (!onlineFixFolder) return false;
      // get the ini file
      const filePath = await path.join(
        onlineFixFolder,
        "Stats",
        "Achievements.ini"
      );

      const readIniFile = new TextDecoder().decode(await readFile(filePath));
      console.log({ readIniFile });
      await saveToTrackList(appid, filePath);
      const parsedData = parsingLogic(readIniFile);
      return parsedData;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  function parsingLogic(content: string) {
    // Only match achievement sections in OnlineFix format: [NAME] achieved=true timestamp=number
    const achievementEntries: { name: string; achievedAt: number }[] = [];
    // Match [SectionName] ... achieved=true ... timestamp=number
    const entryRegex =
      /\[([^\]\n]+)\][^\[]*?achieved\s*=\s*true[^\[]*?timestamp\s*=\s*(\d+)/gi;
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
      achievementEntries.push({
        name: match[1],
        achievedAt: Number(match[2]),
      });
    }
    return achievementEntries;
  }
  return { parseOnlineFixFolder };
};

export default useOnlineFixParserWorkflow;
