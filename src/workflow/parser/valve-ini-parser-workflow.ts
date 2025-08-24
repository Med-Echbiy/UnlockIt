import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import sharedParsingWorkflow from "./shared-parse-workflow";

const useValveIniParser = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { checkExePath } = sharedParsingWorkflow();
  // Implementation of the Valve INI parser workflow

  const fileRegex = /achievements\.bin$/i;
  const findAchievementsBin = async () => {
    // Recursively search for achievements.bin starting from exePath
    async function searchDir(dir: string): Promise<string | null> {
      // remove the .exe part
      if (dir.endsWith(".exe")) {
        dir = dir.slice(0, dir.lastIndexOf("\\"));
      }
      try {
        const entries = await readDir(dir);
        for (const entry of entries) {
          if (fileRegex.test(entry.name) && entry.isFile) {
            return await join(dir, entry.name);
          }
        }
        for (const entry of entries) {
          if (entry.isDirectory) {
            const subdirPath = await join(dir, entry.name);
            const found = await searchDir(subdirPath);
            if (found) return found;
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    }
    return await searchDir(exePath);
  };
  const parseBinFileForAchievements = async () => {
    if (await checkExePath(exePath)) {
      const achievementsBinPath = await findAchievementsBin();
      if (achievementsBinPath) {
        // Read the file as text
        const content = await readTextFile(achievementsBinPath);
        // Parse the content
        const achievementEntries: { name: string; achievedAt: number }[] = [];
        const entryRegex =
          /\[(.+?)\][^\[]*?HaveAchieved=1[^\[]*?HaveAchievedTime=(\d+)/g;
        let match;
        while ((match = entryRegex.exec(content)) !== null) {
          achievementEntries.push({
            name: match[1],
            achievedAt: Number(match[2]),
          });
        }

        return achievementEntries;
      }
    }
    return false;
  };
  return { parseBinFileForAchievements };
};
export default useValveIniParser;
