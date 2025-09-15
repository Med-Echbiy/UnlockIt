import { path } from "@tauri-apps/api";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import sharedParsingWorkflow from "./shared-parse-workflow";

// Enhanced Goldberg parser that supports multiple Goldberg configurations:
// 1. Reads steam_appid.txt from game directory steam_settings folder to get correct app ID
// 2. Uses that app ID to find tracking files in AppData locations (GSE Saves, Goldberg SteamEmu Saves)
// 3. EMPRESS variants (Goldberg-based cracks)
// Note: steam_settings/achievements.json is ignored as it only contains definitions, not unlock tracking
const useGoldbergParserWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { saveToTrackList } = sharedParsingWorkflow();

  async function parseGoldbergFolder(
    app_id: number = appid,
    _exe_path: string = exePath
  ) {
    try {
      const getGoldbergFilesWithId = async () => {
        const foundFiles: { filePath: string; location: string }[] = [];

        try {
          console.log(
            `Searching for Goldberg SteamEmu files for app ID: ${app_id}`
          );

          // NOTE: We skip checking game directory steam_settings folder here
          // because we already extracted the app ID from steam_appid.txt above.
          // The steam_settings/achievements.json is just definitions, not tracking data.

          // First location: AppData Roaming - GSE Saves (most common)
          const homeDir = await path.homeDir();
          const roamingPath = await path.join(homeDir, "AppData", "Roaming");

          const gsePath = await path.join(
            roamingPath,
            "GSE Saves",
            app_id.toString()
          );

          // Alternative location: Goldberg SteamEmu Saves (less common)
          const goldbergPath = await path.join(
            roamingPath,
            "Goldberg SteamEmu Saves",
            app_id.toString()
          );

          console.log(`Home dir: ${homeDir}`);
          console.log(`Roaming path: ${roamingPath}`);
          console.log(`Checking GSE location: ${gsePath}`);
          console.log(`Checking Goldberg location: ${goldbergPath}`);

          // Check both possible locations (GSE Saves first as it's more common)
          const possiblePaths = [gsePath, goldbergPath];

          for (const checkPath of possiblePaths) {
            console.log(`Checking if path exists: ${checkPath}`);
            const pathExists = await exists(checkPath);
            console.log(`Path exists: ${pathExists}`);

            if (pathExists) {
              console.log(`✅ Found Goldberg directory: ${checkPath}`);
              // Look for various achievement files that Goldberg might use
              const achievementFiles = [
                "achievements.json", // Most common format
                "achievements.ini",
                "achiev.ini",
                "stats.ini",
                "Achievements.Bin",
                "achieve.dat",
                "Achievements.ini",
                "stats/achievements.ini",
                "stats.bin",
                "stats/CreamAPI.Achievements.cfg",
              ];

              for (const fileName of achievementFiles) {
                const fullFilePath = await path.join(checkPath, fileName);
                console.log(`Checking file: ${fullFilePath}`);
                const fileExists = await exists(fullFilePath);
                console.log(`File exists: ${fileExists}`);

                if (fileExists) {
                  console.log(
                    `✅ Found Goldberg achievement file: ${fileName} in ${checkPath}`
                  );
                  foundFiles.push({
                    filePath: fullFilePath,
                    location: `Goldberg SteamEmu (${fileName})`,
                  });
                  break; // Only break from this path's file search, continue to next path
                }
              }
            }
          }

          // Third location: AppData Roaming - EMPRESS (Goldberg variant)
          const empressPath = await path.join(
            roamingPath,
            "EMPRESS",
            "remote",
            app_id.toString()
          );

          console.log(`Checking EMPRESS location: ${empressPath}`);

          if (await exists(empressPath)) {
            const achievementFiles = [
              "achievements.ini",
              "achievements.json",
              "achiev.ini",
              "stats.ini",
            ];

            for (const fileName of achievementFiles) {
              const fullFilePath = await path.join(empressPath, fileName);
              if (await exists(fullFilePath)) {
                console.log(`✅ Found EMPRESS achievement file: ${fileName}`);
                foundFiles.push({
                  filePath: fullFilePath,
                  location: `Goldberg EMPRESS (${fileName})`,
                });
                break;
              }
            }
          }

          // Fourth location: Public Documents - EMPRESS
          const publicPath = await path.publicDir();
          const publicEmpressPath = await path.join(
            publicPath,
            "Documents",
            "EMPRESS",
            "remote",
            app_id.toString()
          );

          console.log(`Checking Public EMPRESS location: ${publicEmpressPath}`);

          if (await exists(publicEmpressPath)) {
            const achievementFiles = [
              "achievements.ini",
              "achievements.json",
              "achiev.ini",
              "stats.ini",
            ];

            for (const fileName of achievementFiles) {
              const fullFilePath = await path.join(publicEmpressPath, fileName);
              if (await exists(fullFilePath)) {
                console.log(
                  `✅ Found Public EMPRESS achievement file: ${fileName}`
                );
                foundFiles.push({
                  filePath: fullFilePath,
                  location: `Public EMPRESS (${fileName})`,
                });
                break;
              }
            }
          }

          if (foundFiles.length === 0) {
            console.log(
              `❌ No Goldberg achievement files found for app ${app_id} in any location`
            );
            return null;
          }

          console.log(
            `Found ${foundFiles.length} Goldberg file(s) for app ${app_id}`
          );
          return foundFiles;
        } catch (error) {
          console.error("Error searching for Goldberg files:", error);
          return null;
        }
      };

      const goldbergFiles = await getGoldbergFilesWithId();
      if (!goldbergFiles || goldbergFiles.length === 0) return false;

      // Read and combine content from all found files
      const allAchievements: { name: string; achievedAt: number }[] = [];
      const processedFiles: string[] = [];

      for (const fileInfo of goldbergFiles) {
        try {
          console.log(
            `Reading Goldberg file from ${fileInfo.location}: ${fileInfo.filePath}`
          );
          const fileContent = new TextDecoder().decode(
            await readFile(fileInfo.filePath)
          );

          // Determine parsing method based on file extension
          let parsedData: { name: string; achievedAt: number }[] = [];
          const fileName = fileInfo.filePath.toLowerCase();

          if (fileName.endsWith(".json")) {
            parsedData = parseGoldbergJson(fileContent);
          } else if (fileName.endsWith(".ini")) {
            parsedData = parseGoldbergIni(fileContent);
          } else if (fileName.endsWith(".bin")) {
            // For now, skip binary files - would need special handling
            console.log(`Skipping binary file: ${fileInfo.filePath}`);
            continue;
          }

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
        `Combined Goldberg results: ${combinedResults.length} unique achievements from ${processedFiles.length} file(s)`
      );

      return combinedResults;
    } catch (error) {
      console.error("Error parsing Goldberg folders:", error);
      return false;
    }
  }

  // Parse Goldberg JSON achievement files
  function parseGoldbergJson(
    content: string
  ): { name: string; achievedAt: number }[] {
    try {
      const data = JSON.parse(content);
      const achievements: { name: string; achievedAt: number }[] = [];

      // Handle GSE Saves format (object with achievement names as keys)
      if (
        typeof data === "object" &&
        !Array.isArray(data) &&
        !data.achievements
      ) {
        console.log(
          "Parsing GSE Saves achievements.json format (object with achievement keys)"
        );
        for (const [achievementName, achData] of Object.entries(data)) {
          const achievement = achData as any;

          // Check if earned is true
          if (achievement.earned === true) {
            const unlockTime = achievement.earned_time || Date.now();
            achievements.push({
              name: achievementName,
              achievedAt: Number(unlockTime),
            });
            console.log(
              `Found unlocked achievement: ${achievementName} at ${unlockTime}`
            );
          }
        }
        return achievements;
      }

      // Handle steam_settings/achievements.json format (array of achievement objects)
      // NOTE: This is typically just definitions, not unlock tracking
      if (Array.isArray(data)) {
        console.log(
          "Parsing steam_settings achievements.json format (array) - definitions only"
        );
        for (const achievement of data) {
          // Check if hidden is false (unlocked in some Goldberg setups)
          if (achievement.name && achievement.hidden === false) {
            achievements.push({
              name: achievement.name,
              achievedAt: Date.now(), // No timestamp available in definitions
            });
          }
        }
        return achievements;
      }

      // Handle standard Goldberg JSON format (object with achievements property)
      if (data.achievements) {
        console.log("Parsing standard Goldberg achievements format (object)");
        for (const [name, achData] of Object.entries(data.achievements)) {
          const achievement = achData as any;
          if (
            achievement.earned ||
            achievement.unlocked ||
            achievement.achieved
          ) {
            const unlockTime =
              achievement.unlock_time ||
              achievement.unlocktime ||
              achievement.time ||
              0;
            achievements.push({
              name,
              achievedAt: Number(unlockTime),
            });
          }
        }
      }

      console.log(
        `Parsed ${achievements.length} unlocked achievements from JSON`
      );
      return achievements;
    } catch (error) {
      console.error("Error parsing Goldberg JSON:", error);
      return [];
    }
  }

  // Parse Goldberg INI achievement files
  function parseGoldbergIni(
    content: string
  ): { name: string; achievedAt: number }[] {
    const achievements: { name: string; achievedAt: number }[] = [];

    try {
      // Multiple patterns for different Goldberg INI formats
      const patterns = [
        // Standard Goldberg format: [ACHIEVEMENT_NAME] with Achieved=1 and UnlockTime=timestamp
        /\[([^\]\n]+)\][^\[]*?(?:Achieved|achieved|unlocked)=(?:1|true)[^\[]*?(?:UnlockTime|unlocktime|unlock_time)=(\d+)/gi,
        // Alternative format with different field names
        /\[([^\]\n]+)\][^\[]*?(?:State|state)=(?:1|true)[^\[]*?(?:Time|time)=(\d+)/gi,
        // Simple format with just achievement name and timestamp
        /([^=\n]+)=(\d+)/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          // Skip common section headers
          if (
            match[1] &&
            !["SteamAchievements", "Steam64", "Steam", "ACHIEVE_DATA"].includes(
              match[1]
            )
          ) {
            achievements.push({
              name: match[1].trim(),
              achievedAt: Number(match[2]),
            });
          }
        }

        // If we found achievements with the current pattern, use them
        if (achievements.length > 0) break;
      }

      return achievements;
    } catch (error) {
      console.error("Error parsing Goldberg INI:", error);
      return [];
    }
  }

  return { parseGoldbergFolder };
};

export default useGoldbergParserWorkflow;
