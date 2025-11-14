import { path } from "@tauri-apps/api";
import { readFile } from "@tauri-apps/plugin-fs";
import sharedParsingWorkflow from "./shared-parse-workflow";

const useTenokeParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();

  async function parseTenokeFolder(
    app_id: number = appid,
    exe_path: string = exePath
  ) {
    try {
      const getTenokeAchievementFile = async () => {
        try {
          // TENOKE achievements are stored in SteamData/user_stats.ini in the game directory
          const gameDir = await path.dirname(exe_path);
          return await path.join(gameDir, "SteamData", "user_stats.ini");
        } catch (error) {
          return false;
        }
      };

      const achievementFilePath = await getTenokeAchievementFile();
      if (!achievementFilePath) return false;

      const readIniFile = new TextDecoder().decode(
        await readFile(achievementFilePath)
      );

      await saveToTrackList(app_id, achievementFilePath);
      const parsedData = parsingLogic(readIniFile);
      return parsedData;
    } catch (error) {
      return false;
    }
  }

  function parsingLogic(content: string) {
    const achievementEntries: { name: string; achievedAt: number }[] = [];

    try {
      // Split content into lines
      const lines = content.split(/\r?\n/);
      let inAchievementsSection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if we're entering the ACHIEVEMENTS section
        if (trimmedLine.toLowerCase() === "[achievements]") {
          inAchievementsSection = true;
          continue;
        }

        // Check if we're leaving the ACHIEVEMENTS section
        if (
          inAchievementsSection &&
          trimmedLine.startsWith("[") &&
          trimmedLine.endsWith("]")
        ) {
          break;
        }

        // If we're in the ACHIEVEMENTS section, parse achievement entries
        if (
          inAchievementsSection &&
          !trimmedLine.startsWith("#") &&
          trimmedLine.includes("=")
        ) {
          // Parse TENOKE format: "achievement_name" = {unlocked = true, time = 1761878592}
          const achievementMatch = trimmedLine.match(
            /^"?([^"=]+)"?\s*=\s*\{([^}]+)\}/
          );

          if (achievementMatch) {
            const achievementName = achievementMatch[1].trim();
            const achievementData = achievementMatch[2];

            // Check if achievement is unlocked and extract time
            const unlockedMatch = achievementData.match(/unlocked\s*=\s*true/i);
            const timeMatch = achievementData.match(/time\s*=\s*(\d+)/);

            if (unlockedMatch && timeMatch) {
              const unlockTime = Number(timeMatch[1]);

              if (!isNaN(unlockTime) && unlockTime > 0) {
                achievementEntries.push({
                  name: achievementName,
                  achievedAt: unlockTime,
                });
              }
            }
          }
        }
      }
    } catch (error) {
    }
    return achievementEntries;
  }

  return { parseTenokeFolder };
};

export default useTenokeParserWorkflow;
