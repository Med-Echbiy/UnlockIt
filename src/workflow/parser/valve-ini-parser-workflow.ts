import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import sharedParsingWorkflow from "./shared-parse-workflow";

const useValveIniParser = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { checkExePath, saveToTrackList } = sharedParsingWorkflow();

  // Implementation of the Valve INI parser workflow

  const fileRegex = /achievements\.bin$/i;

  const parseBinFileForAchievements = async (
    app_id: number = appid,
    exe_path: string = exePath
  ) => {
    if (await checkExePath(exe_path)) {
      // Create a temporary findAchievementsBin function with the provided exe_path
      const findAchievementsBinWithPath = async (searchPath: string) => {
        async function searchDir(dir: string): Promise<string | null> {
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
        return await searchDir(searchPath);
      };

      const achievementsBinPath = await findAchievementsBinWithPath(exe_path);
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
        await saveToTrackList(app_id, achievementsBinPath);
        return achievementEntries;
      }
    }
    return false;
  };
  return { parseBinFileForAchievements };
};
export default useValveIniParser;
