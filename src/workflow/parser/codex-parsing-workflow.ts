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
  async function parseCodexFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
      const getTheCodexFolderWithId = async () => {
        try {
          const publicPath = await path.publicDir();
          return path.join(
            publicPath,
            "Documents",
            "Steam",
            "CODEX",
            app_id.toString()
          );
        } catch (error) {
          console.error(error);
          return false;
        }
      };

      const codexFolder = await getTheCodexFolderWithId();
      if (!codexFolder) return false;
      const filePath = await path.join(codexFolder, "achievements.ini");
      const readIniFile = new TextDecoder().decode(await readFile(filePath));

      await saveToTrackList(app_id, filePath);
      const parsedData = parsingLogic(readIniFile);
      return parsedData;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  function parsingLogic(content: string) {
    const achievementEntries: { name: string; achievedAt: number }[] = [];
    const entryRegex =
      /\[([^\]\n]+)\][^\[]*?Achieved=1[^\[]*?UnlockTime=(\d+)/gi;
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
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
