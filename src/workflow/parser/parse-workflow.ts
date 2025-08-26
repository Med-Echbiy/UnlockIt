import { writeFile } from "@tauri-apps/plugin-fs";
import useValveIniParser from "./valve-ini-parser-workflow";
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
  const { updateAchievement } = useAchievementsStore();
  const { parseRuneFolder } = useRuneParserWorkflow({ appid, exePath });
  const { parseCodexFolder } = useCodexParserWorkflow({ appid, exePath });
  const { parseOnlineFixFolder } = useOnlineFixParserWorkflow({
    appid,
    exePath,
  });
  async function parseAchievements(
    app_id: number = appid,
    exe_path: string = exePath
  ) {
    // Why no early return?
    // If multiple sources provide achievements, combine their results before updating.
    // This ensures no duplicate achievements and all sources are considered.
    // Example: You could collect all achievements from each parser, merge them and keep the tracker on the latest update.
    // Sorry english is not my first language :(
    console.log(`Parsing achievements...${app_id}, ${exe_path}`);
    const Type_ALI213 = await parseBinFileForAchievements(app_id, exe_path);
    if (Type_ALI213 && Type_ALI213.length > 0) {
      await LoopAndUpdate(Type_ALI213, app_id);
    }
    const Type_RUNE = await parseRuneFolder(app_id, exe_path);
    if (Type_RUNE && Type_RUNE.length > 0) {
      await LoopAndUpdate(Type_RUNE, app_id);
    }
    const Type_CODEX = await parseCodexFolder(app_id, exe_path);
    if (Type_CODEX && Type_CODEX.length > 0) {
      await LoopAndUpdate(Type_CODEX, app_id);
    }
    const Type_ONLINE_FIX = await parseOnlineFixFolder(app_id, exe_path);
    if (Type_ONLINE_FIX && Type_ONLINE_FIX.length > 0) {
      await LoopAndUpdate(Type_ONLINE_FIX, app_id);
    }
  }
  async function unlockAchievement(
    app_id: string,
    { name, achievedAt }: { name: string; achievedAt: number }
  ) {
    // Always read from the Tauri store (persistent store) as source of truth
    const achievementsStore = await load("achievements.json");
    const currentAchievementData: SteamSchemaResponse | null | undefined =
      await achievementsStore.get(`achievements_${app_id}`);

    if (!currentAchievementData) {
      console.error("No achievement data found in Tauri store");
      return false;
    }

    // Use the current Tauri store data as the source of truth
    const achievements: Achievement[] =
      currentAchievementData.game?.availableGameStats?.achievements || [];
    const updateAchievements = achievements.map((ach) =>
      ach.name === name
        ? {
            ...ach,
            hidden: 0,
            defaultvalue: 1,
            achievedAt: achievedAt.toString(),
          }
        : ach
    );

    // Update the achievement data
    const updated: SteamSchemaResponse = {
      ...currentAchievementData,
      game: {
        ...currentAchievementData.game,
        availableGameStats: {
          ...currentAchievementData.game?.availableGameStats,
          achievements: updateAchievements,
        },
      },
      gameId: Number(app_id),
    };

    // Write back to Tauri store
    await achievementsStore.set(`achievements_${app_id}`, updated);
    await achievementsStore.save();

    // Also write to file to keep it in sync
    const dir = await appLocalDataDir();
    const filePath = await join(
      dir,
      "achievements",
      `achievements_${app_id}.json`
    );
    await writeFile(
      filePath,
      new TextEncoder().encode(JSON.stringify(updated, null, 2))
    );
    return updated;
  }
  async function LoopAndUpdate(
    parsedData: { name: string; achievedAt: number }[],
    appid: number
  ) {
    for (let i = 0; i < parsedData.length; i++) {
      const achievement = parsedData[i];
      const data = await unlockAchievement(appid.toString(), {
        name: achievement.name,
        achievedAt: achievement.achievedAt,
      });
      if (data) {
        // Update Zustand store to trigger React re-render
        // The Tauri store is already updated in unlockAchievement function
        updateAchievement(appid, { ...data });
      }
    }
  }
  return { parseAchievements };
};
export default useParsingWorkflow;
