import { path } from "@tauri-apps/api";
import { readFile, exists } from "@tauri-apps/plugin-fs";

/**
 * Reads steam_appid.txt from game directory steam_settings folder
 * This should be called in the add game workflow to get the correct app ID
 * BEFORE calling any parsers
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
    const steamSettingsPath = await path.join(gameDir, "steam_settings");
    const appIdPath = await path.join(steamSettingsPath, "steam_appid.txt");

    console.log(`Looking for steam_appid.txt at: ${appIdPath}`);

    if (await exists(appIdPath)) {
      const appIdContent = new TextDecoder().decode(await readFile(appIdPath));
      const extractedAppId = parseInt(appIdContent.trim());

      if (!isNaN(extractedAppId)) {
        console.log(`✅ Found Goldberg App ID: ${extractedAppId}`);
        return extractedAppId;
      } else {
        console.warn(
          `⚠️ Invalid App ID in steam_appid.txt: ${appIdContent.trim()}`
        );
        return null;
      }
    } else {
      console.log(`❌ steam_appid.txt not found at: ${appIdPath}`);
      return null;
    }
  } catch (error) {
    console.error("Error reading steam_appid.txt:", error);
    return null;
  }
}
