import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import sharedParsingWorkflow from "./shared-parse-workflow";
const useCodexParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();
  // Your implementation here
  async function getTheCodexFolder() {
    try {
      const publicPath = await path.publicDir();
      console.log({ publicPath });
      return path.join(
        publicPath,
        "Documents",
        "Steam",
        "CODEX",
        appid.toString()
      );
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  async function parseCodexFolder() {
    try {
      const codexFolder = await getTheCodexFolder();
      if (!codexFolder) return false;
      // get the ini file
      const filePath = await path.join(codexFolder, "achievements.ini");
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
  return { parseCodexFolder };
};

export default useCodexParserWorkflow;
