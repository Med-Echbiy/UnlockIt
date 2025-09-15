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
          console.log(
            `Searching for Codex achievements.ini files for app ID: ${app_id}`
          );

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

          console.log(`Checking public location: ${publicFilePath}`);
          if (await exists(publicFilePath)) {
            console.log(`✅ Found Codex achievements.ini in public folder`);
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

          console.log(`Checking AppData Roaming location: ${roamingFilePath}`);
          if (await exists(roamingFilePath)) {
            console.log(`✅ Found Codex achievements.ini in AppData Roaming`);
            foundFiles.push({
              filePath: roamingFilePath,
              location: "AppData Roaming",
            });
          }

          if (foundFiles.length === 0) {
            console.log(
              `❌ No Codex achievements.ini found for app ${app_id} in either location`
            );
            return null;
          }

          console.log(
            `Found ${foundFiles.length} Codex file(s) for app ${app_id}`
          );
          return foundFiles;
        } catch (error) {
          console.error("Error searching for Codex files:", error);
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
          console.log(
            `Reading Codex file from ${fileInfo.location}: ${fileInfo.filePath}`
          );
          const fileContent = new TextDecoder().decode(
            await readFile(fileInfo.filePath)
          );
          const parsedData = parsingLogic(fileContent);

          console.log(
            `Found ${parsedData.length} achievements in ${fileInfo.location}`
          );
          allAchievements.push(...parsedData);
          processedFiles.push(fileInfo.filePath);

          // Track this file for monitoring
          await saveToTrackList(app_id, fileInfo.filePath);
        } catch (error) {
          console.error(`Error reading file from ${fileInfo.location}:`, error);
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
      console.log(
        `Combined results: ${combinedResults.length} unique achievements from ${processedFiles.length} file(s)`
      );

      return combinedResults;
    } catch (error) {
      console.error("Error parsing Codex folders:", error);
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
