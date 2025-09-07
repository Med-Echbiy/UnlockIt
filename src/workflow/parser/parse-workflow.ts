import { writeFile } from "@tauri-apps/plugin-fs";
import useValveIniParser from "./valve-ini-parser-workflow";
import useSteamConfigParser from "./steam-config-parser-workflow";
import useGoldbergParserWorkflow from "./goldberg-parser-workflow";
import { Achievement, SteamSchemaResponse } from "@/types/achievements";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import useAchievementsStore from "@/store/achievements-store";
import { load } from "@tauri-apps/plugin-store";
import useRuneParserWorkflow from "./rune-parser.workflow";
import useCodexParserWorkflow from "./codex-parsing-workflow";
import useOnlineFixParserWorkflow from "./online-fix-parser-workflow";

const useParsingWorkflow = ({
  appid,
  exePath,
}: {
  appid: number;
  exePath: string;
}) => {
  const { parseBinFileForAchievements } = useValveIniParser({ appid, exePath });
  const { parseBinFileForAchievements: parseSteamConfigForAchievements } =
    useSteamConfigParser({ appid, exePath });
  const { updateAchievement } = useAchievementsStore();
  const { parseRuneFolder } = useRuneParserWorkflow({ appid, exePath });
  const { parseCodexFolder } = useCodexParserWorkflow({ appid, exePath });
  const { parseOnlineFixFolder } = useOnlineFixParserWorkflow({
    appid,
    exePath,
  });
  const { parseGoldbergFolder } = useGoldbergParserWorkflow({ appid, exePath });
  async function parseAchievements(
    app_id: number = appid,
    exe_path: string = exePath
  ) {
    console.log(`Parsing achievements...${app_id}, ${exe_path}`);

    // Parse all emulator types in parallel for better performance
    const [
      Type_ALI213,
      Type_STEAM_CONFIG,
      Type_RUNE,
      Type_CODEX,
      Type_ONLINE_FIX,
      Type_GOLDBERG,
    ] = await Promise.all([
      parseBinFileForAchievements(app_id, exe_path).catch(() => []),
      parseSteamConfigForAchievements(app_id, exe_path).catch(() => []),
      parseRuneFolder(app_id, exe_path).catch(() => []),
      parseCodexFolder(app_id, exe_path).catch(() => []),
      parseOnlineFixFolder(app_id, exe_path).catch(() => []),
      parseGoldbergFolder(app_id, exe_path).catch(() => []),
    ]);

    // Combine all achievements from different sources
    const allAchievements = [
      ...(Type_ALI213 || []),
      ...(Type_STEAM_CONFIG || []),
      ...(Type_RUNE || []),
      ...(Type_CODEX || []),
      ...(Type_ONLINE_FIX || []),
      ...(Type_GOLDBERG || []),
    ];

    // Process all achievements at once instead of one by one
    if (allAchievements.length > 0) {
      await batchUpdateAchievements(allAchievements, app_id);
    }
  }
  async function batchUpdateAchievements(
    parsedData: { name: string; achievedAt: number }[],
    app_id: number
  ) {
    if (parsedData.length === 0) return;

    // Load achievement data once
    const achievementsStore = await load("achievements.json");
    const currentAchievementData: SteamSchemaResponse | null | undefined =
      await achievementsStore.get(`achievements_${app_id}`);

    if (!currentAchievementData) {
      console.error("No achievement data found in Tauri store");
      return false;
    }

    const achievements: Achievement[] =
      currentAchievementData.game?.availableGameStats?.achievements || [];

    // Create a Map for O(1) lookup performance
    const achievementsToUpdate = new Map(
      parsedData.map((ach) => [ach.name, ach.achievedAt])
    );

    // Update all achievements in one pass
    const updateAchievements = achievements.map((ach) => {
      const newAchievedAt = achievementsToUpdate.get(ach.name);
      return newAchievedAt !== undefined
        ? {
            ...ach,
            hidden: 0,
            defaultvalue: 1,
            achievedAt: newAchievedAt.toString(),
          }
        : ach;
    });

    // Build updated data structure once
    const updated: SteamSchemaResponse = {
      ...currentAchievementData,
      game: {
        ...currentAchievementData.game,
        availableGameStats: {
          ...currentAchievementData.game?.availableGameStats,
          achievements: updateAchievements,
        },
      },
      gameId: app_id,
    };

    // Perform both store and file operations in parallel
    const [dir] = await Promise.all([
      appLocalDataDir(),
      achievementsStore.set(`achievements_${app_id}`, updated),
    ]);

    const filePath = await join(
      dir,
      "achievements",
      `achievements_${app_id}.json`
    );

    // Save to both store and file in parallel
    await Promise.all([
      achievementsStore.save(),
      writeFile(
        filePath,
        new TextEncoder().encode(JSON.stringify(updated, null, 2))
      ),
    ]);

    // Update the store once with all changes
    updateAchievement(app_id, { ...updated });

    return updated;
  }
  return { parseAchievements };
};
export default useParsingWorkflow;
