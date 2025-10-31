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
      console.log("No exe path provided for steam_appid.txt lookup");
      return null;
    }

    const gameDir = await path.dirname(exePath);
    console.log(
      `🔍 Starting recursive search for steam_settings in: ${gameDir}`
    );

    // Find all steam_settings directories recursively
    const steamSettingsPaths = await findSteamSettingsDirectories(gameDir);

    if (steamSettingsPaths.length === 0) {
      console.log(`❌ No steam_settings directories found in: ${gameDir}`);
      return null;
    }

    console.log(
      `📁 Found ${steamSettingsPaths.length} steam_settings directories`
    );

    // Search for steam_appid.txt in each steam_settings directory
    for (const settingsPath of steamSettingsPaths) {
      const appId = await searchSteamAppIdInDirectory(settingsPath);
      if (appId !== null) {
        return appId;
      }
    }

    console.log(`❌ No steam_appid.txt found in any steam_settings directory`);
    return null;
  } catch (error) {
    console.error("Error reading steam_appid.txt:", error);
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
          console.log(`✅ Found steam_settings directory: ${entryPath}`);
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
    console.log(`⚠️ Could not read directory ${rootPath}: ${error}`);
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
  console.log(`🔍 Searching for steam_appid.txt in: ${settingsPath}`);

  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    // First check if steam_appid.txt exists directly in this directory
    const directAppIdPath = await path.join(settingsPath, "steam_appid.txt");
    if (await exists(directAppIdPath)) {
      console.log(`✅ Found steam_appid.txt at: ${directAppIdPath}`);
      return await readAppIdFromFile(directAppIdPath);
    }

    // If not found directly, search subdirectories
    const entries = await readDir(settingsPath);

    for (const entry of entries) {
      if (entry.isFile && entry.name.toLowerCase() === "steam_appid.txt") {
        const filePath = await path.join(settingsPath, entry.name);
        console.log(`✅ Found steam_appid.txt at: ${filePath}`);
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
    console.log(`⚠️ Could not search in directory ${settingsPath}: ${error}`);
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
      console.warn(`⚠️ steam_appid.txt is empty: ${filePath}`);
      return null;
    }

    const extractedAppId = parseInt(trimmed);

    if (!isNaN(extractedAppId)) {
      console.log(
        `✅ Successfully parsed App ID: ${extractedAppId} from ${filePath}`
      );
      return extractedAppId;
    } else {
      console.warn(
        `⚠️ Invalid App ID in steam_appid.txt: ${trimmed} (${filePath})`
      );
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to read steam_appid.txt from ${filePath}:`, error);
    return null;
  }
}

/**
 * Utility function to find all steam_settings directories in a game path
 */
export async function findAllSteamSettingsPaths(
  gamePath: string
): Promise<string[]> {
  console.log(
    `🔍 Searching for all steam_settings directories in: ${gamePath}`
  );

  const paths = await findSteamSettingsDirectories(gamePath);

  console.log(`📁 Found ${paths.length} steam_settings directories:`, paths);
  return paths;
}
