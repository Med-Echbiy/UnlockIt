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
import useUpdateGameWorkflow from "./update-game-workflow";
// import { igdbClient } from "@/lib/igdb-client"; // Temporarily disabled

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
  const { setGameExePath } = useUpdateGameWorkflow();

  // Helper function to fetch IGDB cover art
  /* TEMPORARILY DISABLED - Uncomment when needed
  async function fetchIGDBCoverArt(
    gameName: string,
    appId: number
  ): Promise<string | null> {
    try {
      console.log(`Fetching IGDB cover for: ${gameName}`);

      // Search for the game on IGDB
      const game = await igdbClient.getGameByName(gameName);

      if (!game?.cover?.image_id) {
        console.log(`No IGDB cover found for: ${gameName}`);
        return null;
      }

      // Get high-quality cover URL (cover_big = 264x374)
      const coverUrl = igdbClient.getImageUrl(game.cover.image_id, "cover_big");
      console.log(`IGDB cover URL: ${coverUrl}`);

      // Download and cache the cover
      const localPath = await downloadImage(
        coverUrl,
        `igdb_cover_${appId}.jpg`
      );
      console.log(`IGDB cover cached at: ${localPath}`);

      return localPath;
    } catch (error) {
      console.error(`Failed to fetch IGDB cover for ${gameName}:`, error);
      return null;
    }
  }
  */

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
      }).catch(() => {
        toast.error("Failed to open file dialog", {
          style: { background: "rgb(185 28 28)" },
        });
        return null;
      });

      if (!gamePath) {
        return false;
      }

      let { name, dir } = getGameNameAndDir(gamePath);
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
      ]).catch(() => {
        return null;
      });
      if (!appId) {
        toast.error("Could not detect game AppID", {
          style: { background: "rgb(185 28 28)" },
          description:
            "Make sure this is a supported game with proper emulator files.",
        });
        return false;
      }

      // Check if game already exists by appId
      const { games } = useMyGamesStore.getState();
      const existingGame = games.find((g) => String(g.appId) === String(appId));

      if (existingGame) {
        // Game already exists, just update the exe path if different
        if (existingGame.exePath !== gamePath || existingGame.dir !== dir) {
          await setGameExePath(String(appId), gamePath, dir);

          toast.success("Game exe path updated", {
            description: `Updated exe path for ${existingGame.name}`,
          });
        } else {
          toast.info("Game already in library", {
            description: `${existingGame.name} is already in your library`,
          });
        }
        return true;
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

      // Check if game was previously added and has existing images
      const gameStore = await load("my-games.json");
      const previousGame = await gameStore.get<any>(`game_${appId}`);
      const hasExistingImages =
        previousGame?.header_image && previousGame?.library_cover;

      // Parallel operations for better performance
      const [imageResults, achievementsResult /*, igdbCoverResult*/] =
        await Promise.allSettled([
          // Download images in parallel (skip if existing images found)
          hasExistingImages
            ? Promise.resolve([previousGame.header_image, null])
            : Promise.all([
                downloadImage(
                  metadata.header_image,
                  `cover_${appId}.jpg`
                ).catch(() => null),
                downloadImage(
                  metadata.background_raw,
                  `background_${appId}.jpg`
                ).catch(() => null),
              ]),
          // Get achievements
          getGameSteamAchievementSchema(String(metadata.steam_appid), gamePath),
          // Fetch IGDB cover art (proper game box art)
          // fetchIGDBCoverArt(name, metadata.steam_appid),
        ]);

      // Execute HowLongToBeat workflow in background (non-blocking)
      executeHowLongToBeatWorkflow(
        String(metadata.steam_appid),
        String(name)
      ).catch(() => {});

      // Auto-download first wallpaper for header_image (skip if existing)
      let autoWallpaper: string | null = hasExistingImages
        ? previousGame.header_image
        : null;
      if (!hasExistingImages) {
        try {
          const wallpaperUrls = await invoke<string[]>(
            "search_game_wallpapers",
            {
              gameName: name,
            }
          );
          if (wallpaperUrls && wallpaperUrls.length > 0) {
            autoWallpaper = await invoke<string>(
              "download_and_save_wallpaper",
              {
                imageUrl: wallpaperUrls[0],
                gameName: name,
                appId: String(metadata.steam_appid),
                oldImagePath: null,
              }
            );
          }
        } catch (error) {
          console.log("Auto wallpaper download failed, using Steam header");
        }
      }

      // Auto-download first library cover (skip if existing)
      let autoLibraryCover: string | null = hasExistingImages
        ? previousGame.library_cover
        : null;
      if (!hasExistingImages) {
        try {
          const coverUrls = await invoke<string[]>("search_game_covers", {
            gameName: name,
          });
          if (coverUrls && coverUrls.length > 0) {
            autoLibraryCover = await invoke<string>("download_and_save_cover", {
              imageUrl: coverUrls[0],
              gameName: name,
              appId: String(metadata.steam_appid),
              oldImagePath: null,
            });
          }
        } catch (error) {
          console.log("Auto library cover download failed");
        }
      }

      setAddGameLoadingProgress(75);

      // Process results with error handling
      const [cover, backgroundImg] =
        imageResults.status === "fulfilled" ? imageResults.value : [null, null];

      const achievements =
        achievementsResult.status === "fulfilled"
          ? achievementsResult.value
          : null;

      // const igdbCover =
      //   igdbCoverResult.status === "fulfilled" ? igdbCoverResult.value : null;
      const igdbCover = null; // IGDB temporarily disabled

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
        header_image: autoWallpaper || cover || metadata.header_image,
        background: backgroundImg || metadata.background_raw,
        background_raw: metadata.background_raw,
        igdb_cover: igdbCover, // IGDB box art cover (portrait)
        library_cover: autoLibraryCover, // Auto-downloaded 2:3 cover
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
      }

      // Store achievements and parse in parallel
      await Promise.allSettled([
        storeJson(achievements, { fileName: `achievements_${app_id}.json` }),
        parseAchievements(Number(app_id), exePath),
      ]);
      return achievements;
    } catch (error) {
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
