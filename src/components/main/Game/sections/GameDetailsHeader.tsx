import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Square,
  Star,
  XCircle,
  Settings,
  Camera,
} from "lucide-react";
import { useEffect, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import clsx from "clsx";
import useMyGamesStore from "@/store/my-games-store";
import usePersistentPlaytimeWorkflow from "@/workflow/persistent-playtime-workflow";
import useAutoGameStatusWorkflow from "@/workflow/auto-game-status-workflow";
import useUpdateGameWorkflow from "@/workflow/update-game-workflow";
import ManualPlaytimeInput from "../manual-playtime-input";
import { GameStatusSelector } from "./GameStatusSelector";
import { GameRatingInput } from "./GameRatingInput";
import { CiPlay1 } from "react-icons/ci";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CoverSelector } from "./CoverSelector";
import { WallpaperSelector } from "./WallpaperSelector";
import { motion } from "framer-motion";
import type { Achievement } from "@/types/achievements";
import useAchievementsStore from "@/store/achievements-store";
import { loadImageWithCache } from "@/lib/image-cache";

export function GameDetailsHeader({ id }: { id: string }) {
  const game = useMyGamesStore((state) => state.getGameById(id as string));
  const achievementData = useAchievementsStore((s) =>
    s.getAchievementByName?.(game?.name || "", String(game?.appId || ""))
  );
  const {
    setGameStatus,
    setGameRating,
    setGameHeaderImage,
    setGameLibraryCover,
  } = useUpdateGameWorkflow();

  const {
    isRunning,
    isMonitoring,
    smartStart,
    stopTracking,
    setManualPlaytime,
  } = usePersistentPlaytimeWorkflow(String(game!.appId), game!.exePath);
  const { checkAndUpdateGameStatus } = useAutoGameStatusWorkflow();
  const [coverImg, setCoverImage] = useState<string | null>(null);
  const [libraryCoverImg, setLibraryCoverImage] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);
  const [wallpaperDialogOpen, setWallpaperDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (game) {
        const checkPath = await exists(game.exePath);
        setInstalled(checkPath);

        setCoverImage(await loadImageWithCache(game.header_image));

        // Load library cover if it exists
        if (game.library_cover) {
          setLibraryCoverImage(await loadImageWithCache(game.library_cover));
        }
      }
    })();
  }, [game?.header_image, game?.library_cover, game?.exePath]);

  const handleWallpaperSelected = async (imagePath: string) => {
    if (game) {
      await setGameHeaderImage(String(game.appId), imagePath);
      const newImg = await loadImageWithCache(imagePath);
      setCoverImage(newImg);
    }
  };

  const handleCoverSelected = async (imagePath: string) => {
    if (game) {
      await setGameLibraryCover(String(game.appId), imagePath);
      const newImg = await loadImageWithCache(imagePath);
      setLibraryCoverImage(newImg);
    }
  };

  // Filter only unlocked achievements for the carousel
  const unlockedAchievements = (
    achievementData?.game?.availableGameStats?.achievements || []
  ).filter((achievement) => achievement.defaultvalue === 1);

  return (
    <>
      <Card className='grid grid-cols-1 w-full pt-0 relative'>
        <div className='flex items-center gap-4 w-full relative'>
          {coverImg && (
            <img
              src={coverImg}
              alt='cover'
              className='object-cover aspect-video object-center w-full flex-shrink-0 blur-[2px]'
            />
          )}
          <div className='bg-gradient-to-t from-card via-card/80 to-transparent h-40 w-full absolute -bottom-1 left-0' />
          <div className='absolute -bottom-48 w-full z-0 pointer-events-none'>
            <VerticalCarousel achievements={unlockedAchievements} />
          </div>
        </div>
        <CardHeader className='relative z-20'>
          <div className='w-full flex flex-col items-center gap-6 bg-gradient-to-t from-card via-card/80 to-transparent'>
            {/* <Separator orientation='vertical' className='min-h-10' /> */}
            <div className='flex-grow flex-2 flex items-end w-full gap-3'>
              {libraryCoverImg && (
                <img
                  src={libraryCoverImg}
                  className='w-[150px] aspect-[2/3] object-cover object-center'
                  alt={game?.name + " Library Cover" || "Library Cover"}
                />
              )}
              <div>
                <div className='mb-5'>
                  {/* Game Tags */}
                  <GameTags genres={game?.genres} />
                </div>
                <div className='flex items-center gap-2 mb-4'>
                  <PlayStopBtn
                    installed={installed}
                    isRunning={isRunning}
                    smartStart={smartStart}
                    stopTracking={stopTracking}
                  />
                  <CardTitle>{game?.name || "Unknown Game"}</CardTitle>
                </div>
                <div className='flex gap-2 md:gap-4 lg:gap-6 items-center flex-wrap'>
                  {/* Combined Playtime Display */}
                  <ManualPlaytimeInput
                    currentPlaytime={game?.playtime || 0}
                    onPlaytimeChange={async (playtime) => {
                      await setManualPlaytime(playtime);
                      // Check if status should be updated to "played"
                      await checkAndUpdateGameStatus(String(game!.appId));
                    }}
                  />

                  {/* Status indicator */}
                  {isRunning && (
                    <Button variant='outline' className='border-blue-500'>
                      <div className='flex items-center gap-2'>
                        <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
                        {isMonitoring ? "Monitoring" : "Tracking"}
                      </div>
                    </Button>
                  )}
                  <Button variant='outline'>
                    <div className='flex items-center gap-2'>
                      <p>metacritic</p>
                      <img
                        src='/metacritic.png'
                        alt='MetaCritic'
                        className='object-contain object-center max-w-[16px]'
                      />
                      {game?.metacritic?.score ?? "N/A"}
                    </div>
                  </Button>
                  <Button
                    variant='outline'
                    className={clsx({
                      "border-green-500 border-2": installed,
                      "border-2 border-red-500": !installed,
                    })}
                  >
                    <div className='flex items-center gap-2'>
                      Installed:{" "}
                      {installed ? (
                        <CheckCircle className='text-green-600' />
                      ) : (
                        <XCircle className='text-red-600' />
                      )}
                    </div>
                  </Button>

                  {/* Game Status Selector */}
                  <GameStatusSelector
                    currentStatus={game?.status || "not-played"}
                    onStatusChange={(status) => setGameStatus(id, status)}
                  />

                  {/* Game Rating */}
                  <GameRatingInput
                    currentRating={game?.my_rating || "N/A"}
                    onRatingChange={(rating) => setGameRating(id, rating)}
                  />

                  <div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className='flex items-center gap-2'>
                          <Settings />
                          Metadata Settings
                        </Button>
                      </DialogTrigger>
                      <DialogContent className='max-w-md'>
                        <div className='space-y-4 p-4'>
                          <h3 className='text-lg font-semibold'>
                            Image Management
                          </h3>
                          <div className='grid grid-cols-1 gap-3'>
                            <Button
                              onClick={() => setWallpaperDialogOpen(true)}
                              variant='outline'
                              className='flex items-center gap-2'
                            >
                              <Camera className='h-4 w-4' />
                              Change Header Wallpaper
                            </Button>
                            <Button
                              onClick={() => setCoverDialogOpen(true)}
                              variant='outline'
                              className='flex items-center gap-2'
                            >
                              <Camera className='h-4 w-4' />
                              Change Game Cover
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Wallpaper Selector Dialog */}
                    {game && (
                      <WallpaperSelector
                        open={wallpaperDialogOpen}
                        onOpenChange={setWallpaperDialogOpen}
                        gameName={game.name}
                        appId={String(game.appId)}
                        currentImagePath={game.header_image}
                        onWallpaperSelected={handleWallpaperSelected}
                      />
                    )}

                    {/* Cover Selector Dialog */}
                    {game && (
                      <CoverSelector
                        open={coverDialogOpen}
                        onOpenChange={setCoverDialogOpen}
                        gameName={game.name}
                        appId={String(game.appId)}
                        currentImagePath={game.library_cover}
                        onCoverSelected={handleCoverSelected}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </>
  );
}

function PlayStopBtn({
  isRunning,
  installed,
  smartStart,
  stopTracking,
}: {
  isRunning: boolean;
  installed: boolean;
  smartStart: () => void;
  stopTracking: () => void;
}) {
  return (
    <>
      {!isRunning ? (
        <Button
          disabled={!installed}
          className='rounded-full aspect-square w-[48px] h-[48px] shadow-blur hover:shadow-blur-lg hover:scale-105 transition-transform'
          onClick={() => smartStart()}
        >
          <CiPlay1 />
        </Button>
      ) : (
        <Button
          className='h-[48px] w-[48px] rounded-full aspect-square shadow-blur hover:shadow-blur-lg hover:scale-105 transition-transform'
          variant='destructive'
          onClick={() => stopTracking()}
        >
          <div className='flex items-center gap-2'>
            <Square />
          </div>
        </Button>
      )}
    </>
  );
}

function GameTags({
  genres,
}: {
  genres?: { description: string; id: string }[];
}) {
  if (!genres || genres.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-2 items-center'>
      <span className='text-sm text-muted-foreground font-medium'>Tags:</span>
      {genres.slice(0, 5).map((genre) => (
        <Badge key={genre.id} variant='secondary' className='text-xs px-2 py-1'>
          {genre.description}
        </Badge>
      ))}
    </div>
  );
}

interface VerticalCarouselProps {
  achievements: Array<
    Achievement & {
      calculatedScore?: number;
      scoreTier?: string;
      baseScore?: number;
      percentage?: number;
    }
  >;
}

function VerticalCarousel({ achievements }: VerticalCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [icons, setIcons] = useState<{ [key: number]: string | null }>({});

  // Load icons for all achievements
  useEffect(() => {
    const loadIcons = async () => {
      const loadedIcons: { [key: number]: string | null } = {};

      for (let i = 0; i < achievements.length; i++) {
        const achievement = achievements[i];
        try {
          let iconPath: string;
          if (achievement.defaultvalue === 0 && achievement.hidden === 1) {
            iconPath = achievement.icongray || achievement.icon || "";
          } else {
            iconPath = achievement.icon || "";
          }

          if (iconPath) {
            const loadedIcon = await loadImageWithCache(iconPath);
            loadedIcons[i] = loadedIcon;
          }
        } catch (error) {
          loadedIcons[i] = null;
        }
      }

      setIcons(loadedIcons);
    };

    if (achievements.length > 0) {
      loadIcons();
    }
  }, [achievements.length, achievements]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (achievements.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % achievements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [achievements.length]);

  if (!achievements || achievements.length === 0) {
    return null;
  }

  const getVisibleAchievements = () => {
    const visible = [];
    // Only show 3 items: -1, 0 (active), 1
    for (let i = -1; i <= 1; i++) {
      const index =
        (activeIndex + i + achievements.length) % achievements.length;
      visible.push({ achievement: achievements[index], offset: i, index });
    }
    return visible;
  };

  return (
    <div className='relative h-[400px] w-full flex items-center justify-center gap-8 px-8 pointer-events-auto'>
      {/* Title */}
      {/* <div className='absolute top-0 left-1/2 transform -translate-x-1/2 z-30'>
        <p className='text-sm text-muted-foreground font-medium'>
          Carousel only unlocked achievement at least three
        </p>
      </div> */}

      {/* Achievement Card - Left Side (Outside Carousel) */}
      <motion.div
        key={`card-${activeIndex}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className='w-[500px]'
      >
        <Card className='relative overflow-hidden border-0 transition-all bg-transparent duration-300 backdrop-blur-sm shadow-none'>
          <CardHeader className='p-4'>
            <div className='flex items-start gap-4'>
              {/* Achievement Icon */}
              <div
                className='relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-0'
                style={{
                  background: `transparent`,
                }}
              >
                {icons[activeIndex] ? (
                  <img
                    src={icons[activeIndex]!}
                    alt={achievements[activeIndex].displayName}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center'>
                    <Star className='w-6 h-6 text-slate-500' />
                  </div>
                )}
              </div>

              {/* Achievement Content */}
              <div className='flex-1 min-w-0 space-y-2'>
                <h3 className='font-semibold text-lg leading-tight'>
                  {achievements[activeIndex].displayName}
                </h3>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                  {achievements[activeIndex].description}
                </p>

                <div className='flex items-center gap-2 pt-2'>
                  <Badge
                    className='px-3 py-1 text-xs font-medium'
                    style={{
                      background:
                        "linear-gradient(135deg, rgb(34, 197, 94), rgb(21, 128, 61))",
                      color: "white",
                    }}
                  >
                    UNLOCKED
                  </Badge>
                  {achievements[activeIndex].percentage !== undefined && (
                    <span className='text-xs text-muted-foreground'>
                      {achievements[activeIndex].percentage}% of players
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Carousel Box - Right Side */}
      <div className='relative h-full w-[200px] flex items-center justify-center'>
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-6'>
          {getVisibleAchievements().map(({ achievement, offset, index }) => {
            const isActive = offset === 0;
            const icon = icons[index];

            return (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 0.8,
                  opacity: isActive ? 1 : 0.5,
                  y: offset * 90,
                  zIndex: isActive ? 10 : 1,
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeInOut",
                }}
                onClick={() => setActiveIndex(index)}
                className='cursor-pointer absolute'
              >
                <div
                  className={`w-16 h-16 rounded-xl overflow-hidden shadow-lg ${
                    isActive ? "ring-red-500 ring-4" : "ring-0"
                  }`}
                  style={{
                    background: `transparent`,
                  }}
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt={achievement.displayName}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <Star className='w-6 h-6 text-slate-500' />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
