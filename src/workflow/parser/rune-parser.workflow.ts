import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
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
  async function parseRuneFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
      // Create a dynamic getTheRunFolder function with the provided app_id
      const getTheRunFolderWithId = async () => {
        try {
          const publicPath = await path.publicDir();
          return path.join(
            publicPath,
            "Documents",
            "Steam",
            "RUNE",
            app_id.toString()
          );
        } catch (error) {
          return false;
        }
      };

      const runFolder = await getTheRunFolderWithId();
      if (!runFolder) return false;
      // get the ini file
      const filePath = await path.join(runFolder, "achievements.ini");

      const readIniFile = new TextDecoder().decode(await readFile(filePath));

      await saveToTrackList(app_id, filePath);
      const parsedData = parsingLogic(readIniFile);
      return parsedData;
    } catch (error) {
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
