import { extractAppIdFromSteamEmuIni } from "@/lib/read_steam_emu_ini";
import useMyGamesStore from "@/store/my-games-store";
import { SteamMetadataMinimal } from "@/types/metadataFromSteam";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import useCacheImageWorkflow from "./cache-image-workflow";
import useRequiredDataStore from "@/store/required-data-store";
import { toast } from "sonner";
import useStoreAchievements from "./store-achievments-workflow";
import { SteamSchemaResponse } from "@/types/achievements";
import useAchievementsStore from "@/store/achievements-store";
import { extractRealAppIdFromOnlineFixIni } from "@/lib/read-Online-fix-ini";
import useUIStateStore from "@/store/ui-state-store";
import useHowLongToBeatWorkflow from "./how-long-to-beat-workflow";

const useAddGameWorkflow = () => {
  const { setAddGameLoading, setGameLoadingName, setAddGameLoadingProgress } =
    useUIStateStore();
  const { addGame } = useMyGamesStore();
  const { addAchievement } = useAchievementsStore();
  const { downloadImage } = useCacheImageWorkflow();

  const { storeJson } = useStoreAchievements();
  const { getSteamApiKey } = useRequiredDataStore();
  const { executeHowLongToBeatWorkflow } = useHowLongToBeatWorkflow();
  async function getGamePath() {
    setAddGameLoadingProgress(5);
    if (!getSteamApiKey()) {
      return toast.error("Please Make Sure to include Your API Key", {
        style: {
          background: "rgb(185 28 28)",
        },
      });
    }
    const gamePath = await open({
      title: "Select Game Executable",
      filters: [
        {
          name: "Executable Files",
          extensions: ["exe"],
        },
      ],
      multiple: false,
      directory: false,
    });
    if (!gamePath) {
      return false;
    }

    let { name, dir } = getGameNameAndDir(gamePath);
    const appId =
      (await extractAppIdFromSteamEmuIni(dir)) ||
      (await extractRealAppIdFromOnlineFixIni(dir));

    let metadata: SteamMetadataMinimal | null = null;
    if (appId) {
      setGameLoadingName(name);
      setAddGameLoading(true);
      setAddGameLoadingProgress(30);
      metadata = await invoke<SteamMetadataMinimal>(
        "fetch_game_metadata_from_steam",
        {
          appId: appId,
        }
      );
      setAddGameLoadingProgress(50);
      if (metadata) {
        name = metadata.name;
        setGameLoadingName(name);
        const [cover, backgroundImg] = await Promise.all([
          downloadImage(metadata.header_image, `cover_${appId}.jpg`),
          downloadImage(metadata.background_raw, `background_${appId}.jpg`),
        ]);
        setAddGameLoadingProgress(75);
        const {
          capsule_image,
          capsule_imagev5,
          background_raw,
          developers,
          release_date,
          steam_appid,
          metacritic,
          genres,
          about_the_game,
          screenshots,
        } = metadata;
        const data = {
          name,
          appId: steam_appid,
          dir,
          capsule_image,
          capsule_imagev5,
          header_image: cover,
          background: backgroundImg,
          background_raw,
          developers,
          release_date,
          metacritic,
          genres,
          about_the_game,
          exePath: gamePath,
          screenshots,
          status: "not-played" as const,
          my_rating: "N/A",
        };
        const achievements = await getGameSteamAchievementSchema(
          String(steam_appid)
        );
        await executeHowLongToBeatWorkflow(String(steam_appid), String(name));
        setAddGameLoadingProgress(89);
        if (achievements && data) {
          addGame(data);
          addAchievement({ ...achievements, gameId: steam_appid });
          const store = await load("my-games.json");
          await store.set(`game_${steam_appid}`, data);
          await store.save();
          const achievements_store = await load("achievements.json");
          await achievements_store.set(`achievements_${steam_appid}`, {
            ...achievements,
            gameId: steam_appid,
          });
          await achievements_store.save();
          setAddGameLoadingProgress(100);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          setAddGameLoading(false);
          setGameLoadingName("");
          return true;
        }
      }
    }
    setAddGameLoading(false);
    setGameLoadingName("");
    return false;
  }
  async function getGameSteamAchievementSchema(app_id: string) {
    const apiKey = getSteamApiKey();
    if (!apiKey) {
      toast.error("Please Make Sure to include You API Key", {
        style: {
          background: "rgb(185 28 28)",
        },
      });
    } else {
      const result: SteamSchemaResponse = await invoke("fetch_achievements", {
        apiKey: apiKey.trim(),
        appid: app_id,
      });

      await storeJson(result, {
        fileName: `achievements_${app_id}.json`,
      });
      return result;
    }
  }
  function getGameNameAndDir(path: string) {
    const normalizedPath = path.replace(/\\/g, "/");
    const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
    const fileWithExt = normalizedPath.substring(
      normalizedPath.lastIndexOf("/") + 1
    );
    const name = fileWithExt.replace(/\.[^/.]+$/, ""); // Remove extension
    return { dir: dir.replace(/\//g, "\\"), name };
  }
  return { getGamePath };
};

export default useAddGameWorkflow;
