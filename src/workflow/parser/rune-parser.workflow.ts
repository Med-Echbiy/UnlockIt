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
  async function parseRuneFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
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
    const achievementEntries: { name: string; achievedAt: number }[] = [];

    // Updated regex to handle achievements with or without UnlockTime
    const entryRegex = /\[([^\]\n]+)\][^\[]*?Achieved=1/gi;
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
      const achievementName = match[1];
      if (achievementName.toLowerCase() === "steamachievements") continue;

      // Extract the full achievement section
      const startIndex = match.index;
      const nextBracketIndex = content.indexOf("[", startIndex + 1);
      const section = content.substring(
        startIndex,
        nextBracketIndex === -1 ? content.length : nextBracketIndex
      );

      // Try to extract UnlockTime if it exists
      const unlockTimeMatch = section.match(/UnlockTime=(\d+)/i);
      const unlockTime = unlockTimeMatch
        ? Number(unlockTimeMatch[1])
        : Math.floor(Date.now() / 1000);

      achievementEntries.push({
        name: achievementName,
        achievedAt: unlockTime,
      });
    }

    return achievementEntries;
  }
  return { parseRuneFolder };
};

export default useRuneParserWorkflow;
