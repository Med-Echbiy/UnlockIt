import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

/**
 * Recursively searches for TENOKE configuration files in the game folder
 * Supports both "TENOKE.ini" and "tenoke.ini" (case insensitive)
 */
async function findTenokeConfigRecursive(
  dir: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<string | null> {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const entries = await readDir(dir);

    // First check for TENOKE config files in current directory
    for (const entry of entries) {
      if (entry.isFile && entry.name.toLowerCase().match(/^tenoke\.ini$/)) {
        return await join(dir, entry.name);
      }
    }

    // Then recursively search subdirectories
    for (const entry of entries) {
      if (entry.isDirectory) {
        const subdirPath = await join(dir, entry.name);
        const found = await findTenokeConfigRecursive(
          subdirPath,
          maxDepth,
          currentDepth + 1
        );
        if (found) return found;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Parses TENOKE configuration file to extract Steam App ID
 * Expected format:
 * [TENOKE]
 * # appid
 * id = 2062430 # BALL x PIT
 */
async function parseTenokeConfig(filePath: string): Promise<number | null> {
  try {
    const content = await readTextFile(filePath);

    // Split content into lines
    const lines = content.split(/\r?\n/);
    let inTenokeSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if we're entering the TENOKE section
      if (trimmedLine.toLowerCase() === "[tenoke]") {
        inTenokeSection = true;
        continue;
      }

      // Check if we're leaving the TENOKE section
      if (
        inTenokeSection &&
        trimmedLine.startsWith("[") &&
        trimmedLine.endsWith("]")
      ) {
        break;
      }

      // If we're in the TENOKE section, look for the id field
      if (
        inTenokeSection &&
        !trimmedLine.startsWith("#") &&
        trimmedLine.includes("=")
      ) {
        // Match patterns like: "id = 2062430" or "id = 2062430 # comment"
        const idMatch = trimmedLine.match(/^id\s*=\s*(\d+)/i);
        if (idMatch) {
          const appId = parseInt(idMatch[1]);
          if (!isNaN(appId)) {
            return appId;
          }
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Main function to extract App ID from TENOKE configuration files
 * Searches the game directory and subdirectories for TENOKE.ini or tenoke.ini
 */
export async function extractAppIdFromTenokeConfig(
  gameDir: string
): Promise<number | null> {
  try {
    if (!gameDir) {
      return null;
    }
    // First try direct lookup in the game directory
    const directConfigFiles = ["TENOKE.ini", "tenoke.ini"];

    for (const configFile of directConfigFiles) {
      try {
        const directPath = await join(gameDir, configFile);
        const appId = await parseTenokeConfig(directPath);
        if (appId !== null) {
          return appId;
        }
      } catch (e) {
        // File doesn't exist or can't be read, continue to next
      }
    }

    // If direct lookup fails, search recursively
    const foundConfigPath = await findTenokeConfigRecursive(gameDir);
    if (foundConfigPath) {
      return await parseTenokeConfig(foundConfigPath);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Utility function to find all TENOKE config files in a game path
 */
export async function findAllTenokeConfigPaths(
  gamePath: string
): Promise<string[]> {
  const configs: string[] = [];

  async function searchRecursively(
    dir: string,
    maxDepth: number = 10,
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    try {
      const entries = await readDir(dir);

      for (const entry of entries) {
        if (entry.isFile && entry.name.toLowerCase().match(/^tenoke\.ini$/)) {
          const configPath = await join(dir, entry.name);
          configs.push(configPath);
        } else if (entry.isDirectory) {
          const subdirPath = await join(dir, entry.name);
          await searchRecursively(subdirPath, maxDepth, currentDepth + 1);
        }
      }
    } catch (e) {
      // Ignore errors and continue searching
    }
  }

  await searchRecursively(gamePath);
  return configs;
}
