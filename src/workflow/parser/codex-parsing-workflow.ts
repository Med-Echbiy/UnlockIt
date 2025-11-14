import { path } from "@tauri-apps/api";
import { readFile, exists } from "@tauri-apps/plugin-fs";
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
      const getTheCodexFilesWithId = async () => {
        const foundFiles: { filePath: string; location: string }[] = [];

        try {
          // First location: Public Documents folder
          const publicPath = await path.publicDir();
          const publicCodexPath = await path.join(
            publicPath,
            "Documents",
            "Steam",
            "CODEX",
            app_id.toString()
          );
          const publicFilePath = await path.join(
            publicCodexPath,
            "achievements.ini"
          );
          if (await exists(publicFilePath)) {
            foundFiles.push({
              filePath: publicFilePath,
              location: "Public Documents",
            });
          }

          // Second location: AppData Roaming folder
          const homeDir = await path.homeDir();
          const roamingPath = await path.join(homeDir, "AppData", "Roaming");
          const roamingCodexPath = await path.join(
            roamingPath,
            "Steam",
            "CODEX",
            app_id.toString()
          );
          const roamingFilePath = await path.join(
            roamingCodexPath,
            "achievements.ini"
          );
          if (await exists(roamingFilePath)) {
            foundFiles.push({
              filePath: roamingFilePath,
              location: "AppData Roaming",
            });
          }

          if (foundFiles.length === 0) {
            return null;
          }
          return foundFiles;
        } catch (error) {
          return null;
        }
      };

      const codexFiles = await getTheCodexFilesWithId();
      if (!codexFiles || codexFiles.length === 0) return false;

      // Read and combine content from all found files
      const allAchievements: { name: string; achievedAt: number }[] = [];
      const processedFiles: string[] = [];

      for (const fileInfo of codexFiles) {
        try {
          const fileContent = new TextDecoder().decode(
            await readFile(fileInfo.filePath)
          );
          const parsedData = parsingLogic(fileContent);
          allAchievements.push(...parsedData);
          processedFiles.push(fileInfo.filePath);

          // Track this file for monitoring
          await saveToTrackList(app_id, fileInfo.filePath);
        } catch (error) {
        }
      }

      // Remove duplicates based on achievement name, keeping the most recent unlock time
      const uniqueAchievements = new Map<
        string,
        { name: string; achievedAt: number }
      >();

      for (const achievement of allAchievements) {
        const existing = uniqueAchievements.get(achievement.name);
        if (!existing || achievement.achievedAt > existing.achievedAt) {
          uniqueAchievements.set(achievement.name, achievement);
        }
      }

      const combinedResults = Array.from(uniqueAchievements.values());
      return combinedResults;
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
  return { parseCodexFolder };
};

export default useCodexParserWorkflow;
