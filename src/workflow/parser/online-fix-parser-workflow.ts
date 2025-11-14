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
      return false;
    }
  }
  function parsingLogic(content: string) {
    const achievementEntries: { name: string; achievedAt: number }[] = [];

    // Updated regex to handle achievements with or without timestamp
    const entryRegex = /\[([^\]\n]+)\][^\[]*?achieved\s*=\s*true/gi;
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
      const achievementName = match[1];

      // Extract the full achievement section
      const startIndex = match.index;
      const nextBracketIndex = content.indexOf("[", startIndex + 1);
      const section = content.substring(
        startIndex,
        nextBracketIndex === -1 ? content.length : nextBracketIndex
      );

      // Try to extract timestamp if it exists
      const timestampMatch = section.match(/timestamp\s*=\s*(\d+)/i);
      const timestamp = timestampMatch
        ? Number(timestampMatch[1])
        : Math.floor(Date.now() / 1000);

      achievementEntries.push({
        name: achievementName,
        achievedAt: timestamp,
      });
    }

    return achievementEntries;
  }
  return { parseOnlineFixFolder };
};

export default useOnlineFixParserWorkflow;
