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
  // Your implementation here
  async function parseOnlineFixFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
      // Create a dynamic getTheOnlineFixFolder function with the provided app_id
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
      // get the ini file
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
