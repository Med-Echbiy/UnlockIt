import { readFile, writeFile } from "@tauri-apps/plugin-fs";
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
    const Type_ALI213 = await parseBinFileForAchievements();
    if (Type_ALI213 && Type_ALI213.length > 0) {
      console.log("ITS A ALI213 CRACK");
      await LoopAndUpdate(Type_ALI213, app_id);
    }
    const Type_RUNE = await parseRuneFolder();
    if (Type_RUNE && Type_RUNE.length > 0) {
      console.log("ITS A RUNE CRACK");
      await LoopAndUpdate(Type_RUNE, app_id);
    }
    const Type_CODEX = await parseCodexFolder();
    if (Type_CODEX && Type_CODEX.length > 0) {
      console.log("ITS A CODEX CRACK");
      await LoopAndUpdate(Type_CODEX, app_id);
    }
    const Type_ONLINE_FIX = await parseOnlineFixFolder();
    if (Type_ONLINE_FIX && Type_ONLINE_FIX.length > 0) {
      console.log("ITS A ONLINE FIX CRACK");
      await LoopAndUpdate(Type_ONLINE_FIX, app_id);
    }
  }
  async function unlockAchievement(
    app_id: string,
    { name, achievedAt }: { name: string; achievedAt: number }
  ) {
    // Use the appid to get the achievement file
    const dir = await appLocalDataDir();
    const filePath = await join(
      dir,
      "achievements",
      `achievements_${app_id}.json`
    );
    let getFile;
    try {
      getFile = await readFile(filePath);
      getFile = new TextDecoder().decode(getFile);
    } catch (e) {
      // File does not exist or cannot be read
      console.error("We Found AN Error");
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
      console.error("Can't Parse");
      return false;
    }
    const achievements: Achievement[] =
      parsed.game?.availableGameStats?.achievements || [];
    const updateAchievements = achievements.map((ach) =>
      ach.name === name
        ? { ...ach, hidden: 0, defaultvalue: 1, achievedAt: achievedAt }
        : ach
    );
    console.log("=============");
    // Update the file, preserving all other game data
    const updated: SteamSchemaResponse = {
      ...parsed,
      game: {
        ...parsed.game,
        availableGameStats: {
          ...parsed.game?.availableGameStats,
          achievements: updateAchievements,
        },
      },
      gameId: appid,
    };
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
      if (data && !parsedData[i + 1]) {
        console.log("last update", data);
        const achievementsStore = await load("achievements.json");
        await achievementsStore.set(`achievements_${appid}`, data);
        await achievementsStore.save();
        updateAchievement(appid, data);
      }
    }
  }
  return { parseAchievements };
};
export default useParsingWorkflow;
