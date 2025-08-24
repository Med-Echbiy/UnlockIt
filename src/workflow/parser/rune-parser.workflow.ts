import useAchievementsStore from "@/store/achievements-store";
import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import useInitialWorkflow from "../initial_workflow";
import sharedParsingWorkflow from "./shared-parse-workflow";
const useRuneParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();
  // Your implementation here
  async function getTheRunFolder() {
    try {
      const publicPath = await path.publicDir();
      console.log({ publicPath });
      return path.join(
        publicPath,
        "Documents",
        "Steam",
        "RUNE",
        appid.toString()
      );
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  async function parseRuneFolder() {
    try {
      const runFolder = await getTheRunFolder();
      if (!runFolder) return false;
      // get the ini file
      const filePath = await path.join(runFolder, "achievements.ini");

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
    // Only match achievement sections, ignore [SteamAchievements] etc.
    const achievementEntries: { name: string; achievedAt: number }[] = [];
    // Match [SectionName] ... Achieved=1 ... UnlockTime=number
    const entryRegex =
      /\[([^\]\n]+)\][^\[]*?Achieved=1[^\[]*?UnlockTime=(\d+)/gi;
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
      // Ignore SteamAchievements section
      if (match[1].toLowerCase() === "steamachievements") continue;
      achievementEntries.push({
        name: match[1],
        achievedAt: Number(match[2]),
      });
    }
    return achievementEntries;
  }
  return { parseRuneFolder };
};

export default useRuneParserWorkflow;
