import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import sharedParsingWorkflow from "./shared-parse-workflow";
const useOnlineFixParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();
  async function parseOnlineFixFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
      const getTheOnlineFixFolderWithId = async () => {
        try {
          const publicPath = await path.publicDir();
          return path.join(
            publicPath,
            "Documents",
            "OnlineFix",
            app_id.toString()
          );
        } catch (error) {
          console.error(error);
          return false;
        }
      };

      const onlineFixFolder = await getTheOnlineFixFolderWithId();

      if (!onlineFixFolder) return false;
      const filePath = await path.join(
        onlineFixFolder,
        "Stats",
        "Achievements.ini"
      );

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
