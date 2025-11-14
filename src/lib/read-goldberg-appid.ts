import { path } from "@tauri-apps/api";
import { readFile, exists, readDir } from "@tauri-apps/plugin-fs";

/**
 * Recursively searches for steam_settings directories in the game folder
 * Then looks for steam_appid.txt inside those directories
 */
export async function readGoldbergAppId(
  exePath: string
): Promise<number | null> {
  try {
    if (!exePath) {
      return null;
    }

    const gameDir = await path.dirname(exePath);
    // Find all steam_settings directories recursively
    const steamSettingsPaths = await findSteamSettingsDirectories(gameDir);

    if (steamSettingsPaths.length === 0) {
      return null;
    }
    // Search for steam_appid.txt in each steam_settings directory
    for (const settingsPath of steamSettingsPaths) {
      const appId = await searchSteamAppIdInDirectory(settingsPath);
      if (appId !== null) {
        return appId;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Recursively find all steam_settings directories in the given path
 */
async function findSteamSettingsDirectories(
  rootPath: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<string[]> {
  const steamSettingsPaths: string[] = [];

  if (currentDepth >= maxDepth) {
    return steamSettingsPaths;
  }

  try {
    if (!(await exists(rootPath))) {
      return steamSettingsPaths;
    }

    const entries = await readDir(rootPath);

    for (const entry of entries) {
      if (entry.isDirectory) {
        const entryPath = await path.join(rootPath, entry.name);

        // Check if this directory is named "steam_settings" (case insensitive)
        if (entry.name.toLowerCase() === "steam_settings") {
          steamSettingsPaths.push(entryPath);
        }

        // Recursively search subdirectories
        const subDirPaths = await findSteamSettingsDirectories(
          entryPath,
          maxDepth,
          currentDepth + 1
        );
        steamSettingsPaths.push(...subDirPaths);
      }
    }
  } catch (error) {
    // If we can't read a directory (permissions, etc.), just skip it
  }

  return steamSettingsPaths;
}

/**
 * Search for steam_appid.txt in a steam_settings directory (including subdirectories)
 */
async function searchSteamAppIdInDirectory(
  settingsPath: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<number | null> {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    // First check if steam_appid.txt exists directly in this directory
    const directAppIdPath = await path.join(settingsPath, "steam_appid.txt");
    if (await exists(directAppIdPath)) {
      return await readAppIdFromFile(directAppIdPath);
    }

    // If not found directly, search subdirectories
    const entries = await readDir(settingsPath);

    for (const entry of entries) {
      if (entry.isFile && entry.name.toLowerCase() === "steam_appid.txt") {
        const filePath = await path.join(settingsPath, entry.name);
        return await readAppIdFromFile(filePath);
      } else if (entry.isDirectory) {
        // Recursively search subdirectories
        const entryPath = await path.join(settingsPath, entry.name);
        const appId = await searchSteamAppIdInDirectory(
          entryPath,
          maxDepth,
          currentDepth + 1
        );
        if (appId !== null) {
          return appId;
        }
      }
    }
  } catch (error) {
  }

  return null;
}

/**
 * Read and parse the App ID from steam_appid.txt file
 */
async function readAppIdFromFile(filePath: string): Promise<number | null> {
  try {
    const appIdContent = new TextDecoder().decode(await readFile(filePath));
    const trimmed = appIdContent.trim();

    if (trimmed === "") {
      return null;
    }

    const extractedAppId = parseInt(trimmed);

    if (!isNaN(extractedAppId)) {
      return extractedAppId;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Utility function to find all steam_settings directories in a game path
 */
export async function findAllSteamSettingsPaths(
  gamePath: string
): Promise<string[]> {
  const paths = await findSteamSettingsDirectories(gamePath);
  return paths;
}
