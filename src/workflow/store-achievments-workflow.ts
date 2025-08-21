import { Achievement, SteamSchemaResponse } from "@/types/achievements";
import { appDataDir } from "@tauri-apps/api/path";
import { writeFile, mkdir, readFile } from "@tauri-apps/plugin-fs";
import useCacheImageWorkflow from "./cache-image-workflow";

interface StoreJsonOptions {
  fileName: string; // file name, default: achievements.json
}

const useStoreAchievements = () => {
  const { downloadImage, loadImage } = useCacheImageWorkflow();
  async function storeJson(
    data: SteamSchemaResponse,
    options: StoreJsonOptions
  ) {
    const appDir = await appDataDir();
    const dir = `${appDir}achievements`;
    const achievements = await storeAchievementIcons(
      data.game.availableGameStats?.achievements || []
    );
    data.game.availableGameStats!.achievements = achievements;
    const fileName = options.fileName ? options.fileName : "achievements.json";
    // Ensure directory exists
    await mkdir(dir, { recursive: true });
    const filePath = `${dir}/${fileName}`;
    const json = JSON.stringify(data, null, 2);
    await writeFile(filePath, new TextEncoder().encode(json));
    return filePath;
  }
  async function cacheAchievementIcons(ach: Achievement) {
    if (ach.icon) {
      await downloadImage(ach.icon, `icon_${ach.name}.jpg`);
    }
    if (ach.icongray) {
      await downloadImage(ach.icongray, `icongray_${ach.name}.jpg`);
    }
    const iconUrl = await loadImage(`icon_${ach.name}.jpg`);
    const icongrayUrl = await loadImage(`icongray_${ach.name}.jpg`);
    return { iconUrl, icongrayUrl };
  }
  async function storeAchievementIcons(achievements: Achievement[]) {
    const newAchievements = await Promise.all(
      achievements.map(async (ach) => {
        const { iconUrl, icongrayUrl } = await cacheAchievementIcons(ach);
        return { ...ach, icon: iconUrl, icongray: icongrayUrl };
      })
    );
    return newAchievements;
  }
  async function unlockAchievement(app_id: string, { name }: { name: string }) {
    // Use the appid to get the achievement file
    const dir = await appDataDir();
    const filePath = `${dir}achievements/achievements_${app_id}.json`;
    let getFile;
    try {
      getFile = await readFile(filePath);
    } catch (e) {
      // File does not exist or cannot be read
      return false;
    }
    let parsed;
    try {
      parsed =
        typeof getFile === "string"
          ? JSON.parse(getFile)
          : JSON.parse(new TextDecoder().decode(getFile));
    } catch (e) {
      // Invalid JSON
      return false;
    }
    const achievements: Achievement[] =
      parsed.game?.availableGameStats?.achievements || [];
    const updateAchievements = achievements.map((ach) =>
      ach.name === name ? { ...ach, hidden: 1 } : ach
    );
    // Update the file, preserving all other game data
    const updated = {
      ...parsed,
      game: {
        ...parsed.game,
        availableGameStats: {
          ...parsed.game?.availableGameStats,
          achievements: updateAchievements,
        },
      },
    };
    await writeFile(
      filePath,
      new TextEncoder().encode(JSON.stringify(updated, null, 2))
    );
    return true;
  }
  return { storeJson, unlockAchievement };
};

export default useStoreAchievements;
