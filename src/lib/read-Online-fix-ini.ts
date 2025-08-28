import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
async function findIniRecursive(
  dir: string,
  iniName: string
): Promise<string | null> {
  try {
    const entries = await readDir(dir);
    for (const entry of entries) {
      if (entry.name === iniName && entry.isFile) {
        return await join(dir, entry.name);
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory) {
        const subdirPath = await join(dir, entry.name);
        const found = await findIniRecursive(subdirPath, iniName);
        if (found) return found;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function extractRealAppIdFromOnlineFixIni(dir: string) {
  const iniFile = "OnlineFix.ini";
  try {
    const directPath = await join(dir, iniFile);
    const content = await readTextFile(directPath);
    const appIdMatch = content.match(/RealAppId\s*=\s*(\d+)/i);
    if (appIdMatch) return appIdMatch[1];
  } catch (e) {}
  const foundPath = await findIniRecursive(dir, iniFile);
  if (foundPath) {
    try {
      const content = await readTextFile(foundPath);
      const appIdMatch = content.match(/RealAppId\s*=\s*(\d+)/i);
      if (appIdMatch) return appIdMatch[1];
    } catch (readError) {}
  }
  return null;
}
