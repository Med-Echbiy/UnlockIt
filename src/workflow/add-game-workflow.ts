import { extractAppIdFromSteamEmuIni } from "@/lib/read_steam_emu_ini";
import useMyGamesStore from "@/store/my-games-store";
import { SteamMetadataMinimal } from "@/types/metadataFromSteam";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";

const useAddGameWorkflow = () => {
  const { addGame } = useMyGamesStore();
  async function getGamePath() {
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
    console.log({ data: getGameNameAndDir(gamePath) });
    let { name, dir } = getGameNameAndDir(gamePath);
    const appId = await extractAppIdFromSteamEmuIni(dir);
    console.log({ appId, name, dir });
    let metadata: SteamMetadataMinimal | null = null;
    if (appId) {
      metadata = await invoke<SteamMetadataMinimal>(
        "fetch_game_metadata_from_steam",
        {
          appId: appId,
        }
      );
      console.log({ metadata });
      if (metadata) {
        name = metadata.name;
        // You can use these fields as needed
        const {
          capsule_image,
          capsule_imagev5,
          header_image,
          background,
          background_raw,
          developers,
          release_date,
          steam_appid,
          metacritic,
          genres,
          about_the_game,
        } = metadata;
        const data = {
          name,
          appId: steam_appid,
          dir,
          capsule_image,
          capsule_imagev5,
          header_image,
          background,
          background_raw,
          developers,
          release_date,
          metacritic,
          genres,
          about_the_game,
          exePath: gamePath,
        };
        addGame(data);
        const store = await load("my-games.json");
        await store.set(`game_${steam_appid}`, data);
        await store.save();
        return true;
      }
    }
    return false;
  }

  function getGameNameAndDir(path: string) {
    // Normalize path separators for Windows
    const normalizedPath = path.replace(/\\/g, "/");
    const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
    const fileWithExt = normalizedPath.substring(
      normalizedPath.lastIndexOf("/") + 1
    );
    const name = fileWithExt.replace(/\.[^/.]+$/, ""); // Remove extension
    return { dir: dir.replace(/\//g, "\\"), name };
  }
  function addGameToLibrary() {}
  return { getGamePath };
};

export default useAddGameWorkflow;
