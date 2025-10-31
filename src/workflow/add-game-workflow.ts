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
import { SteamSchemaResponse, Achievement } from "@/types/achievements";
import useAchievementsStore from "@/store/achievements-store";
import { extractRealAppIdFromOnlineFixIni } from "@/lib/read-Online-fix-ini";
import { readGoldbergAppId } from "@/lib/read-goldberg-appid";
import { extractAppIdFromTenokeConfig } from "@/lib/read-tenoke-config";
import useUIStateStore from "@/store/ui-state-store";
import useHowLongToBeatWorkflow from "./how-long-to-beat-workflow";
import useParsingWorkflow from "./parser/parse-workflow";
import useAutoGameStatusWorkflow from "./auto-game-status-workflow";

const useAddGameWorkflow = () => {
  const { setAddGameLoading, setGameLoadingName, setAddGameLoadingProgress } =
    useUIStateStore();
  const { addGame } = useMyGamesStore();
  const { addAchievement } = useAchievementsStore();
  const { downloadImage } = useCacheImageWorkflow();
  const { parseAchievements } = useParsingWorkflow({
    appid: 0,
    exePath: "",
  });
  const { storeJson } = useStoreAchievements();
  const { getSteamApiKey } = useRequiredDataStore();
  const { executeHowLongToBeatWorkflow } = useHowLongToBeatWorkflow();
  const { checkAndUpdateGameStatus } = useAutoGameStatusWorkflow();

  // Helper function to fetch metadata with retry logic
  async function fetchMetadataWithRetry(
    appId: number,
    maxRetries: number
  ): Promise<SteamMetadataMinimal | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const metadata = await invoke<SteamMetadataMinimal>(
          "fetch_game_metadata_from_steam",
          { appId: String(appId) }
        );
        return metadata;
      } catch (error) {
        console.warn(`Metadata fetch attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          toast.error("Failed to fetch game metadata", {
            style: { background: "rgb(185 28 28)" },
            description:
              "This game may not have metadata on Steam or the Steam API is unreachable.",
          });
          return null;
        }

        // Exponential backoff: wait longer between retries
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
    return null;
  }

  // Helper function to save game data atomically
  async function saveGameDataAtomically(
    gameData: any,
    achievements: SteamSchemaResponse
  ): Promise<void> {
    try {
      // Load stores in parallel
      const [gameStore, achievementsStore] = await Promise.all([
        load("my-games.json"),
        load("achievements.json"),
      ]);

      // Prepare achievement data
      const achievementData = { ...achievements, gameId: gameData.appId };

      // Set data in parallel
      await Promise.all([
        gameStore.set(`game_${gameData.appId}`, gameData),
        achievementsStore.set(
          `achievements_${gameData.appId}`,
          achievementData
        ),
      ]);

      // Save stores in parallel
      await Promise.all([gameStore.save(), achievementsStore.save()]);

      // Update in-memory stores
      addGame(gameData);
      addAchievement(achievementData);
    } catch (error) {
      console.error("Failed to save game data:", error);
      throw new Error("Failed to save game data to storage");
    }
  }
  async function getGamePath() {
    let isLoading = false;
    try {
      setAddGameLoadingProgress(5);

      // Early validation
      if (!getSteamApiKey()) {
        return toast.error("Please Make Sure to include Your API Key", {
          style: {
            background: "rgb(185 28 28)",
          },
        });
      }

      // File selection with error handling
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
      }).catch((error) => {
        console.error("File dialog error:", error);
        toast.error("Failed to open file dialog", {
          style: { background: "rgb(185 28 28)" },
        });
        return null;
      });

      if (!gamePath) {
        return false;
      }

      let { name, dir } = getGameNameAndDir(gamePath);
      console.log({ name, dir });

      // Start loading state
      isLoading = true;
      setGameLoadingName(name);
      setAddGameLoading(true);
      setAddGameLoadingProgress(15);

      // Extract AppID with timeout and fallback
      const appId = await Promise.race([
        Promise.all([
          extractAppIdFromSteamEmuIni(dir).catch(() => null),
          extractRealAppIdFromOnlineFixIni(dir).catch(() => null),
          readGoldbergAppId(gamePath).catch(() => null), // Add Goldberg support
          extractAppIdFromTenokeConfig(dir).catch(() => null), // Add TENOKE support
        ]).then(
          ([steamEmuId, onlineFixId, goldbergId, tenokeId]) =>
            steamEmuId || onlineFixId || goldbergId || tenokeId
        ),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("AppID extraction timeout")), 5000)
        ),
      ]).catch((error) => {
        console.warn("AppID extraction failed:", error);
        return null;
      });

      console.log({ appId });

      if (!appId) {
        toast.error("Could not detect game AppID", {
          style: { background: "rgb(185 28 28)" },
          description:
            "Make sure this is a supported game with proper emulator files.",
        });
        return false;
      }

      setAddGameLoadingProgress(25);

      // Fetch metadata with retry logic
      const metadata = await fetchMetadataWithRetry(Number(appId), 3);
      if (!metadata) {
        return false;
      }

      name = metadata.name;
      setGameLoadingName(name);
      setAddGameLoadingProgress(40);

      // Parallel operations for better performance
      const [imageResults, achievementsResult] = await Promise.allSettled([
        // Download images in parallel
        Promise.all([
          downloadImage(metadata.header_image, `cover_${appId}.jpg`).catch(
            () => null
          ),
          downloadImage(
            metadata.background_raw,
            `background_${appId}.jpg`
          ).catch(() => null),
        ]),
        // Get achievements
        getGameSteamAchievementSchema(String(metadata.steam_appid), gamePath),
      ]);

      // Execute HowLongToBeat workflow in background (non-blocking)
      executeHowLongToBeatWorkflow(
        String(metadata.steam_appid),
        String(name)
      ).catch(console.warn);

      setAddGameLoadingProgress(75);

      // Process results with error handling
      const [cover, backgroundImg] =
        imageResults.status === "fulfilled" ? imageResults.value : [null, null];

      const achievements =
        achievementsResult.status === "fulfilled"
          ? achievementsResult.value
          : null;

      if (!achievements) {
        toast.error("Failed to fetch achievements", {
          style: { background: "rgb(185 28 28)" },
          description:
            "This game may not have achievements on Steam or the Steam API is unreachable.",
        });
        return false;
      }

      // Prepare game data
      const gameData = {
        name,
        appId: metadata.steam_appid,
        dir,
        capsule_image: metadata.capsule_image,
        capsule_imagev5: metadata.capsule_imagev5,
        header_image: cover || metadata.header_image,
        background: backgroundImg || metadata.background_raw,
        background_raw: metadata.background_raw,
        developers: metadata.developers,
        release_date: metadata.release_date,
        metacritic: metadata.metacritic,
        genres: metadata.genres,
        about_the_game: metadata.about_the_game,
        exePath: gamePath,
        screenshots: metadata.screenshots,
        status: "not-played" as const,
        my_rating: "N/A",
        playtime: 0, // Initialize with 0 playtime
      };

      setAddGameLoadingProgress(85);

      // Save data with atomic operations
      await saveGameDataAtomically(gameData, achievements);

      setAddGameLoadingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Reduced delay

      toast.success(`${name} added successfully!`, {
        style: { background: "rgb(34 197 94)" },
      });

      // Check and auto-update game status based on existing playtime/achievements
      setTimeout(() => {
        checkAndUpdateGameStatus(String(metadata.steam_appid));
      }, 1000);

      return true;
    } catch (error) {
      console.error("Add game workflow error:", error);
      toast.error("Failed to add game", {
        style: { background: "rgb(185 28 28)" },
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    } finally {
      if (isLoading) {
        setAddGameLoading(false);
        setGameLoadingName("");
      }
    }
  }
  async function getGameSteamAchievementSchema(
    app_id: string,
    exePath: string = ""
  ): Promise<SteamSchemaResponse | null> {
    const apiKey = getSteamApiKey();
    if (!apiKey) {
      toast.error("Please Make Sure to include Your API Key", {
        style: { background: "rgb(185 28 28)" },
      });
      return null;
    }

    try {
      // Fetch achievements and percentages in parallel with timeout
      const [achievementsResult, percentagesResult] = await Promise.allSettled([
        Promise.race([
          invoke("fetch_achievements", {
            apiKey: apiKey.trim(),
            appid: app_id,
          }) as Promise<SteamSchemaResponse>,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Achievements fetch timeout")),
              10000
            )
          ),
        ]),
        Promise.race([
          invoke("fetch_steam_achievement_percentages", {
            appid: app_id,
          }) as Promise<any>,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Percentages fetch timeout")),
              10000
            )
          ),
        ]),
      ]);

      // Handle achievements result
      if (achievementsResult.status === "rejected") {
        console.error(
          "Failed to fetch achievements:",
          achievementsResult.reason
        );
        toast.error("Failed to fetch achievements", {
          style: { background: "rgb(185 28 28)" },
          description: "Could not retrieve achievement data from Steam API.",
        });
        return null;
      }

      const achievements = achievementsResult.value;

      // Handle percentages result (optional, don't fail if this doesn't work)
      if (
        percentagesResult.status === "fulfilled" &&
        percentagesResult.value?.achievementpercentages?.achievements
      ) {
        // Create percentage map for O(1) lookup
        const percentageMap = new Map<string, string>(
          percentagesResult.value.achievementpercentages.achievements.map(
            (item: any) => [item.name, String(item.percent)]
          )
        );

        // Apply percentages efficiently
        if (achievements.game?.availableGameStats?.achievements) {
          achievements.game.availableGameStats.achievements =
            achievements.game.availableGameStats.achievements.map(
              (achievement): Achievement => ({
                ...achievement,
                percent: percentageMap.get(achievement.name) || "0",
              })
            );
        }
      } else {
        console.warn(
          "Failed to fetch achievement percentages, proceeding without them"
        );
      }

      // Store achievements and parse in parallel
      await Promise.allSettled([
        storeJson(achievements, { fileName: `achievements_${app_id}.json` }),
        parseAchievements(Number(app_id), exePath),
      ]);

      console.log({ achievementsResult: achievements });
      return achievements;
    } catch (error) {
      console.error("Achievement schema fetch error:", error);
      toast.error("Failed to process achievements", {
        style: { background: "rgb(185 28 28)" },
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      return null;
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
