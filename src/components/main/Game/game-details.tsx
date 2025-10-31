import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import usePersistentPlaytimeWorkflow from "@/workflow/persistent-playtime-workflow";
import useAutoGameStatusWorkflow from "@/workflow/auto-game-status-workflow";
import ManualPlaytimeInput from "./manual-playtime-input";
import useHowLongToBeatWorkflow from "@/workflow/how-long-to-beat-workflow";
import useScoringSystemWorkflow from "@/workflow/scoring-system-worfklow";
import { HowLongToBeatGame } from "@/types/howLongToBeat";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle,
  Clock,
  Lock,
  Play,
  Square,
  Star,
  Unlock,
  XCircle,
  Trophy,
  RefreshCcw,
  Trash,
  Edit,
  Save,
  X,
  CircleDot,
  CheckCircle2,
  GamepadIcon,
  Medal,
  Zap,
  Target,
  Search,
  ExternalLink,
  Users,
  Gamepad2,
  Calendar,
  RotateCcw,
  Gem,
  Award,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { exists } from "@tauri-apps/plugin-fs";
import clsx from "clsx";
import { GameStoreData } from "@/types/Game";
import { Achievement } from "@/types/achievements";
import { motion } from "framer-motion";
import useParsingWorkflow from "@/workflow/parser/parse-workflow";
import useResetAchievementsWorkflow from "@/workflow/reset-achievements-workflow";
import useUIStateStore from "@/store/ui-state-store";
import { useGameCardTier } from "@/hooks/use-ranking";
import useUpdateGameWorkflow from "@/workflow/update-game-workflow";
import { Input } from "@/components/ui/input";
import { formatPlayTime } from "@/lib/howLongToBeatHelper";
import { SystemScoreAchievement } from "./system-score-achievement";
import { getTierByPercentage, TIER_CONFIGS } from "@/lib/ranking-system";
import type { AchievementTier } from "@/lib/ranking-system";
import { GameScore } from "@/types/scoring";
import useSilentPercentageRefreshWorkflow from "@/workflow/silent-percentage-refresh-workflow";

function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const game = useMyGamesStore((state) => state.getGameById(id as string));

  // Dialog state for HowLongToBeat search
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { executeHowLongToBeatWorkflow } = useHowLongToBeatWorkflow();
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchHowLongToBeat = async (gameName: string) => {
    setIsLoading(true);
    setIsDialogOpen(false);
    try {
      await executeHowLongToBeatWorkflow(String(game?.appId), gameName);
    } catch (error) {
      console.error("Error fetching HowLongToBeat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!game) {
    return <></>;
  }

  return (
    <main className='w-full min-h-screen p-2 max-w-screen-2xl mx-auto'>
      {game && (
        <>
          <Card className='grid grid-cols-1 p-3 gap-5 bg-transparent border-none  shadow-none'>
            <GameDetailsHeader id={id!} />
            <Separator />
            <SystemScoreSection game={game} />
            <Separator />
            <HowLongToBeatHeader
              game={game}
              onOpenDialog={() => {
                setSearchQuery(game.name);
                setIsDialogOpen(true);
              }}
            />
            <Separator />
            <GameDetailsAchievements game={game} />
          </Card>
        </>
      )}

      {/* Simple modal overlay */}
      {isDialogOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4'
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className='text-lg font-semibold mb-4'>Search HowLongToBeat</h3>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Enter game name...'
              className='w-full mb-4'
              autoFocus
            />
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (searchQuery.trim()) {
                    handleFetchHowLongToBeat(searchQuery.trim());
                  }
                }}
                disabled={!searchQuery.trim() || isLoading}
                className='bg-blue-600 hover:bg-blue-700 flex-1'
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
export default GameDetails;

function SystemScoreSection({ game }: { game: GameStoreData }) {
  const { calculateGameScore } = useScoringSystemWorkflow();
  const [gameScore, setGameScore] = useState<GameScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get achievements from store
  const rawAchievements = useAchievementsStore(
    (s) =>
      s.getAchievementByName?.(game?.name, String(game?.appId))?.game
        ?.availableGameStats?.achievements
  );
  const achievements = Array.isArray(rawAchievements) ? rawAchievements : [];
  const totalUnlocked = achievements.filter(
    (e) => e?.defaultvalue === 1
  ).length;
  const totalAchievements = achievements.length;

  // Use the new ranking system
  const { config: tierConfig } = useGameCardTier(
    totalUnlocked,
    totalAchievements
  );

  useEffect(() => {
    const calculateScore = async () => {
      try {
        setIsLoading(true);
        const score = calculateGameScore(game.appId);
        setGameScore(score);
      } catch (error) {
        console.error("Error calculating game score:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateScore();
  }, [game]);

  const formatScore = (score: number): string => {
    if (isNaN(score) || score === 0) return "0";
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className='w-full'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <BarChart3 className='w-5 h-5 text-white animate-pulse' />
            </div>
            <div>
              <CardTitle className='text-xl'>System Score</CardTitle>
              <CardDescription>
                Calculating game performance metrics...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!gameScore) {
    return (
      <Card className='w-full'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center'>
              <BarChart3 className='w-5 h-5 text-white' />
            </div>
            <div>
              <CardTitle className='text-xl'>System Score</CardTitle>
              <CardDescription>
                No scoring data available for this game
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className='w-full'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='w-10 h-10 rounded-lg flex items-center justify-center shadow-lg'
              style={{
                background: `linear-gradient(135deg, ${tierConfig.colors.background})`,
              }}
            >
              <BarChart3 className='w-5 h-5 text-white' />
            </div>
            <div>
              <CardTitle className='text-xl'>System Score</CardTitle>
              <CardDescription>
                Performance analysis and ranking for {game.name}
              </CardDescription>
            </div>
          </div>
          {/* <div className='flex items-center gap-3'>
            <Badge
              variant='outline'
              className='px-4 py-2 text-white border-0 shadow-lg'
              style={{
                background: `linear-gradient(135deg, ${tierConfig.colors.background})`,
              }}
            >
              <div className='flex items-center gap-2'>
                {(() => {
                  const IconComponent = tierConfig.icon;
                  return (
                    <IconComponent
                      className={`h-4 w-4 ${tierConfig.colors.text}`}
                    />
                  );
                })()}
                <span className='font-bold'>{tierConfig.name}</span>
              </div>
            </Badge>
          </div> */}
        </div>

        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6'>
          {/* Total Score */}
          <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 text-center border'>
            <div className='flex items-center justify-center gap-1 text-sm font-medium mb-2 text-blue-600 dark:text-blue-400'>
              <TrendingUp className='w-4 h-4' />
              Total Score
            </div>
            <div className='text-2xl font-bold text-foreground mb-1 font-mono'>
              {formatScore(Math.round(gameScore.totalGameScore || 0))}
            </div>
            <div className='text-xs text-muted-foreground'>points</div>
          </div>

          {/* Completion Percentage */}
          <div className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 text-center border'>
            <div className='flex items-center justify-center gap-1 text-sm font-medium mb-2 text-green-600 dark:text-green-400'>
              <Target className='w-4 h-4' />
              Completion
            </div>
            <div className='text-2xl font-bold text-foreground mb-1'>
              {(gameScore.completionPercentage || 0).toFixed(1)}%
            </div>
            <div className='text-xs text-muted-foreground'>progress</div>
          </div>

          {/* Achievements */}
          <div className='bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg p-4 text-center border'>
            <div className='flex items-center justify-center gap-1 text-sm font-medium mb-2 text-amber-600 dark:text-amber-400'>
              <Trophy className='w-4 h-4' />
              Achievements
            </div>
            <div className='text-2xl font-bold text-foreground mb-1'>
              {gameScore.achievements?.length || 0}
            </div>
            <div className='text-xs text-muted-foreground'>unlocked</div>
          </div>

          {/* Achievement Tier Position */}
          <div
            className='rounded-lg p-4 text-center border'
            style={{
              background: `linear-gradient(135deg, ${tierConfig.colors.background}20, ${tierConfig.colors.background}10)`,
            }}
          >
            <div
              className={`flex items-center justify-center gap-1 text-sm font-medium mb-2 ${tierConfig.colors.text}`}
            >
              {(() => {
                const IconComponent = tierConfig.icon;
                return <IconComponent className='h-4 w-4' />;
              })()}
              Achievement Tier
            </div>
            <div className='text-lg font-bold text-foreground mb-1'>
              {tierConfig.name}
            </div>
            <div className='text-xs text-muted-foreground'>current tier</div>
          </div>
        </div>

        {/* Achievement Breakdown */}
        {gameScore.achievements && gameScore.achievements.length > 0 && (
          <div className='mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border'>
            <h4 className='text-sm font-semibold mb-3 text-foreground'>
              Achievement Breakdown
            </h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
              {gameScore.achievements
                .slice(0, 6)
                .map((achievement, index: number) => (
                  <SystemScoreAchievement
                    key={index}
                    achievement={achievement}
                    index={index}
                  />
                ))}
            </div>
            {gameScore.achievements.length > 6 && (
              <div className='text-center mt-3'>
                <Badge variant='outline' className='text-xs'>
                  +{gameScore.achievements.length - 6} more achievements
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

function GameDetailsHeader({ id }: { id: string }) {
  const game = useMyGamesStore((state) => state.getGameById(id as string));
  const { setGameStatus, setGameRating } = useUpdateGameWorkflow();

  const {
    isRunning,
    isMonitoring,
    formatPlaytime,
    smartStart,
    stopTracking,
    setManualPlaytime,
  } = usePersistentPlaytimeWorkflow(String(game!.appId), game!.exePath);
  const { checkAndUpdateGameStatus } = useAutoGameStatusWorkflow();
  const [coverImg, setCoverImage] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (game) {
        const checkPath = await exists(game.exePath);
        setInstalled(checkPath);

        setCoverImage(
          await invoke("load_image", {
            path: game.header_image,
          })
        );
      }
    })();
  }, [id]);
  return (
    <Card className='grid grid-cols-1 w-full'>
      <CardHeader>
        <div className='w-full flex items-center gap-6'>
          <div className='flex items-center gap-4 min-w-[300px]'>
            {coverImg && (
              <img
                src={coverImg}
                alt='cover'
                className='object-cover object-center w-32 h-20 rounded-2xl flex-shrink-0'
              />
            )}
            <div className='flex flex-col gap-3'>
              <CardTitle>{game!.name}</CardTitle>
              <CardDescription className='flex items-center gap-2 flex-wrap'>
                {game!.genres.map((g) => (
                  <Badge key={g.id} variant='outline'>
                    {g.description}
                  </Badge>
                ))}
              </CardDescription>
            </div>
          </div>
          <Separator orientation='vertical' className='min-h-10' />
          <div className='flex-grow flex-2'>
            <div className='flex gap-2 md:gap-4 lg:gap-6 items-center flex-wrap'>
              {!isRunning ? (
                <Button
                  disabled={!installed}
                  className='max-w-fit'
                  onClick={() => smartStart()}
                >
                  <div className='flex items-center gap-2'>
                    <Play />
                    {isMonitoring ? "Monitor" : "Play"}
                  </div>
                </Button>
              ) : (
                <Button
                  className='max-w-fit'
                  variant='destructive'
                  onClick={() => stopTracking()}
                >
                  <div className='flex items-center gap-2'>
                    <Square />
                    Stop
                  </div>
                </Button>
              )}

              {/* Manual Playtime Input */}
              <ManualPlaytimeInput
                currentPlaytime={game?.playtime || 0}
                onPlaytimeChange={async (playtime) => {
                  await setManualPlaytime(playtime);
                  // Check if status should be updated to "played"
                  await checkAndUpdateGameStatus(String(game!.appId));
                }}
              />

              {/* Auto-tracked playtime display */}
              <Button className='flex items-center gap-2' variant='outline'>
                <Clock />
                <span>{formatPlaytime()}</span>
                <span className='text-xs text-muted-foreground ml-1'>
                  (tracked)
                </span>
              </Button>

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
                  <Star />
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
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// RefreshButton component to handle cooldown display
function RefreshButton({
  onRefresh,
  isRefreshing,
  canRefresh,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: () => Promise<{ canRefresh: boolean; timeRemaining?: number }>;
}) {
  const [refreshStatus, setRefreshStatus] = useState<{
    canRefresh: boolean;
    timeRemaining?: number;
  }>({ canRefresh: true });
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const checkRefreshStatus = async () => {
      const status = await canRefresh();
      setRefreshStatus(status);

      if (!status.canRefresh && status.timeRemaining) {
        const hours = Math.floor(status.timeRemaining / 3600000);
        const minutes = Math.floor((status.timeRemaining % 3600000) / 60000);
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining("");
      }
    };

    checkRefreshStatus();
    // Update every minute to show accurate countdown
    const interval = setInterval(checkRefreshStatus, 60000);

    return () => clearInterval(interval);
  }, [canRefresh]);

  const buttonText = isRefreshing ? "Refreshing..." : "Refresh Achievements";

  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant='default'
      title={
        !refreshStatus.canRefresh
          ? `Refresh achievement files (always available) and data. Steam percentage fetching in cooldown: ${timeRemaining}. File checking has no limits.`
          : "Refresh achievement files and fetch latest percentages from Steam API"
      }
    >
      {buttonText}
      <RefreshCcw className={isRefreshing ? "animate-spin" : ""} />
    </Button>
  );
}

function GameDetailsAchievements({ game }: { game: GameStoreData }) {
  const rawAchievements = useAchievementsStore(
    (s) =>
      s.getAchievementByName?.(game?.name, String(game?.appId))?.game
        ?.availableGameStats?.achievements
  );
  const achievements = Array.isArray(rawAchievements) ? rawAchievements : [];
  const unlocked = achievements.filter((e) => e?.defaultvalue === 1).length;
  const total = achievements.length;
  const [filter, setFilter] = useState<
    "all" | "unlocked" | "locked" | "hidden"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredAchievements = !Array.isArray(achievements)
    ? []
    : filter === "all"
    ? achievements
    : filter === "unlocked"
    ? achievements.filter((a) => a?.defaultvalue === 1)
    : filter === "locked"
    ? achievements.filter((a) => a?.defaultvalue === 0)
    : achievements.filter((a) => a?.hidden === 1);
  const { parseAchievements } = useParsingWorkflow({
    appid: game.appId,
    exePath: game.exePath,
  });
  const { resetAchievements } = useResetAchievementsWorkflow(game.appId);
  const { manualRefreshPercentages, canRefresh } =
    useSilentPercentageRefreshWorkflow();
  const { setConfirmationModal, confirmationModal } = useUIStateStore();

  async function onRefresh() {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      // ALWAYS parse local achievement files - NO COOLDOWN
      // This checks achievement files from various crackers/emulators
      await parseAchievements();

      // Check if Steam API percentage refresh is allowed (24h cooldown)
      const refreshStatus = await canRefresh();
      if (!refreshStatus.canRefresh && refreshStatus.timeRemaining) {
        const hours = Math.floor(refreshStatus.timeRemaining / 3600000);
        const minutes = Math.floor(
          (refreshStatus.timeRemaining % 3600000) / 60000
        );

        toast.info(
          `Achievement files refreshed! Percentages are in cooldown (${hours}h ${minutes}m remaining). Only percentage fetching is limited, not file checking.`,
          { duration: 5000 }
        );

        console.log(
          "✅ Achievement parsing completed (percentages not refreshed due to cooldown)"
        );
      } else {
        // Also refresh percentages from Steam API
        await manualRefreshPercentages();
        console.log("✅ Achievement refresh and percentage update completed");
        toast.success(
          "Achievement files and percentages refreshed successfully!"
        );
      }
    } catch (error) {
      console.error("❌ Failed to refresh achievements:", error);
      toast.error("Failed to refresh achievement data");
    } finally {
      setIsRefreshing(false);
    }
  }

  function onReset() {
    setConfirmationModal(true, "reset achievements", () => {
      resetAchievements();
      confirmationModal.onCancel();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-2'>
            <div>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>
                {total > 0
                  ? `You Have Unlocked ${unlocked} of ${total}`
                  : "No achievements found for this game."}
              </CardDescription>
            </div>
            {total > 0 && (
              <div className='flex justify-between items-center gap-2'>
                <div className='flex gap-2 mt-2'>
                  <Button
                    size='sm'
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    size='sm'
                    variant={filter === "unlocked" ? "default" : "outline"}
                    onClick={() => setFilter("unlocked")}
                  >
                    Unlocked
                  </Button>
                  <Button
                    size='sm'
                    variant={filter === "locked" ? "default" : "outline"}
                    onClick={() => setFilter("locked")}
                  >
                    Locked
                  </Button>
                  <Button
                    size='sm'
                    variant={filter === "hidden" ? "default" : "outline"}
                    onClick={() => setFilter("hidden")}
                  >
                    Hidden
                  </Button>
                </div>
                <div className='flex items-center gap-2'>
                  <RefreshButton
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                    canRefresh={canRefresh}
                  />
                  <Button variant='destructive' onClick={() => onReset()}>
                    Reset Achievements
                    <Trash />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {total > 0 ? (
            filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement?.name}
                achievement={achievement}
              />
            ))
          ) : (
            <div className='col-span-full text-center text-muted-foreground'>
              No achievements to display.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate achievement tier based on Steam's global unlock percentage
  const achievementPercentage = achievement.percent
    ? parseFloat(achievement.percent)
    : 100;
  const achievementTier: AchievementTier = getTierByPercentage(
    achievementPercentage
  );
  const tierConfig = TIER_CONFIGS[achievementTier];

  useEffect(() => {
    const loadIcon = async () => {
      try {
        setIsLoading(true);
        let iconPath: string;

        if (achievement.defaultvalue === 0 && achievement.hidden === 1) {
          iconPath = achievement.icongray || achievement.icon || "";
        } else {
          iconPath = achievement.icon || "";
        }

        if (iconPath) {
          const loadedIcon = await invoke<string>("load_image", {
            path: iconPath,
          });
          setIcon(loadedIcon);
        }
      } catch (error) {
        console.error("Error loading achievement icon:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIcon();
  }, [
    achievement.icon,
    achievement.icongray,
    achievement.defaultvalue,
    achievement.hidden,
  ]);

  const isUnlocked = achievement.defaultvalue === 1;
  const isHidden = achievement.hidden === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className='group'
    >
      <Card
        className='relative overflow-hidden border-2 transition-all duration-300 backdrop-blur-sm hover:shadow-xl h-full flex flex-col'
        style={{
          background: isUnlocked
            ? `linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(21, 128, 61, 0.02))`
            : `linear-gradient(135deg, rgba(71, 85, 105, 0.15), rgba(51, 65, 85, 0.05))`,
          borderColor: isUnlocked
            ? "rgb(34, 197, 94)"
            : "rgba(71, 85, 105, 0.2)",
          boxShadow: isUnlocked
            ? `0 4px 20px rgba(34, 197, 94, 0.2)`
            : "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Animated gradient overlay on hover */}
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

        {/* Status indicator */}
        <div className='absolute top-3 right-3 z-10'>
          {isUnlocked ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className='relative'
            >
              <div className='w-6 h-6 rounded-full flex items-center justify-center bg-green-500'>
                <Unlock className='w-3 h-3 text-white' />
              </div>
            </motion.div>
          ) : (
            <div className='w-6 h-6 rounded-full bg-slate-600/50 flex items-center justify-center'>
              <Lock className='w-3 h-3 text-slate-400' />
            </div>
          )}
        </div>

        <CardHeader className='p-4 flex-1 flex flex-col'>
          <div className='flex items-start gap-4 flex-1'>
            {/* Achievement Icon */}
            <div
              className='relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-2 transition-all duration-300 group-hover:ring-4'
              style={{
                background: isUnlocked
                  ? `linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(21, 128, 61, 0.2))`
                  : `linear-gradient(135deg, rgba(71, 85, 105, 0.4), rgba(51, 65, 85, 0.2))`,
                borderColor: isUnlocked
                  ? `rgb(34, 197, 94)`
                  : "rgba(71, 85, 105, 0.3)",
              }}
            >
              {isLoading ? (
                <div className='w-full h-full bg-slate-300 dark:bg-slate-600 animate-pulse rounded-xl flex items-center justify-center'>
                  <Trophy className='w-6 h-6 text-slate-500' />
                </div>
              ) : icon ? (
                <motion.img
                  src={icon}
                  alt={achievement.name}
                  className='w-full h-full object-cover'
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  {(() => {
                    const IconComponent = tierConfig.icon;
                    return (
                      <IconComponent
                        className={`w-6 h-6 ${tierConfig.colors.text}`}
                      />
                    );
                  })()}
                </div>
              )}

              {/* Hover overlay for unlocked achievements */}
              {isUnlocked && (
                <div
                  className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                  style={{
                    background: `linear-gradient(to top, rgba(34, 197, 94, 0.4), transparent)`,
                  }}
                />
              )}
            </div>

            {/* Achievement Content */}
            <div className='flex-1 min-w-0 space-y-3'>
              <div className='space-y-2'>
                <h3
                  className={`font-semibold text-lg leading-tight transition-colors duration-300 ${
                    isUnlocked
                      ? "text-foreground group-hover:text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {achievement.displayName}
                </h3>

                <p
                  className={`text-sm leading-relaxed transition-colors duration-300 ${
                    isUnlocked
                      ? "text-muted-foreground group-hover:text-foreground"
                      : "text-muted-foreground/70 group-hover:text-muted-foreground"
                  }`}
                >
                  {isHidden && !isUnlocked
                    ? "Hidden Achievement - Unlock to reveal description"
                    : achievement.description}
                </p>
              </div>

              {/* Achievement Status & Tier */}
              <div className='flex items-center justify-between gap-2'>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <Badge
                    className='px-3 py-1 text-xs font-medium rounded-full border-0 transition-all duration-300 group-hover:scale-105'
                    style={{
                      background: isUnlocked
                        ? `linear-gradient(135deg, ${tierConfig.colors.background})`
                        : "linear-gradient(135deg, rgb(71, 85, 105), rgb(51, 65, 85))",
                      color: "white",
                    }}
                  >
                    <span className='flex items-center gap-1.5'>
                      {isUnlocked ? (
                        <>
                          <Unlock className='w-3 h-3' />
                          <span>UNLOCKED</span>
                        </>
                      ) : (
                        <>
                          <Lock className='w-3 h-3' />
                          <span>LOCKED</span>
                        </>
                      )}
                    </span>
                  </Badge>
                </motion.div>

                {/* Tier Badge for unlocked achievements */}
                {isUnlocked && (
                  <Badge
                    variant='outline'
                    className={`text-xs px-2 py-1 ${tierConfig.colors.text}`}
                    style={{
                      borderColor: `${tierConfig.colors.background}60`,
                      background: `${tierConfig.colors.background}10`,
                    }}
                  >
                    {achievementTier}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

const getStatusIcon = (status: GameStoreData["status"]) => {
  const iconMap = {
    "not-played": CircleDot,
    playing: GamepadIcon,
    played: CheckCircle2,
    completed: Trophy,
    beaten: Medal,
    trash: Trash,
  };
  return iconMap[status] || CircleDot;
};

const getStatusColor = (status: GameStoreData["status"]) => {
  const colorMap = {
    "not-played": "text-gray-400 bg-gray-100 hover:bg-gray-200 border-gray-300",
    playing: "text-blue-400 bg-blue-100 hover:bg-blue-200 border-blue-300",
    played: "text-green-400 bg-green-100 hover:bg-green-200 border-green-300",
    completed:
      "text-yellow-400 bg-yellow-100 hover:bg-yellow-200 border-yellow-300",
    beaten:
      "text-purple-400 bg-purple-100 hover:bg-purple-200 border-purple-300",
    trash: "text-red-400 bg-red-100 hover:bg-red-200 border-red-300",
  };
  return colorMap[status] || colorMap["not-played"];
};

const getRatingTier = (rating: string) => {
  if (rating === "N/A") return "na";
  const numRating = Number(rating);
  if (numRating <= 10) return "red";
  if (numRating <= 30) return "bronze";
  if (numRating <= 60) return "silver";
  if (numRating <= 90) return "gold";
  return "diamond";
};

const getRatingIcon = (rating: string) => {
  const tier = getRatingTier(rating);
  const iconMap = {
    na: Star,
    red: XCircle,
    bronze: Medal,
    silver: Award,
    gold: Trophy,
    diamond: Gem,
  };
  return iconMap[tier] || Star;
};

const getRatingStyles = (rating: string) => {
  const tier = getRatingTier(rating);
  const styleMap = {
    na: "text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-300",
    red: "text-red-600 bg-red-50 hover:bg-red-100 border-red-300",
    bronze: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300",
    silver: "text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-300",
    gold: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-300",
    diamond: "text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border-cyan-300",
  };
  return styleMap[tier] || styleMap.na;
};

const getRatingLabel = (rating: string) => {
  const tier = getRatingTier(rating);
  const labelMap = {
    na: "N/A",
    red: "Poor",
    bronze: "Fair",
    silver: "Good",
    gold: "Great",
    diamond: "Masterpiece",
  };
  return labelMap[tier] || "N/A";
};

function GameStatusSelector({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: GameStoreData["status"];
  onStatusChange: (status: GameStoreData["status"]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const StatusIcon = getStatusIcon(currentStatus);

  const statusOptions: { value: GameStoreData["status"]; label: string }[] = [
    { value: "not-played", label: "Not Played" },
    { value: "playing", label: "Playing" },
    { value: "played", label: "Played" },
    { value: "completed", label: "Completed" },
    { value: "beaten", label: "Beaten" },
    { value: "trash", label: "Trash" },
  ];

  const handleStatusSelect = (status: GameStoreData["status"]) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className='relative'>
      <Button
        variant='outline'
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${getStatusColor(currentStatus)}`}
      >
        <StatusIcon className='w-4 h-4' />
        <span className='hidden sm:inline'>
          {statusOptions.find((s) => s.value === currentStatus)?.label ||
            "Not Played"}
        </span>
      </Button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={() => setIsOpen(false)}
          />
          <div className='absolute top-full mt-1 right-0 z-20 w-48 rounded-md shadow-lg border border-gray-200'>
            {statusOptions.map((option) => {
              const OptionIcon = getStatusIcon(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={`
                    w-full flex items-center gap-2 px-3 bg-card py-2 text-sm text-left hover:bg-gray-800
                    first:rounded-t-md last:rounded-b-md
                    ${option.value === currentStatus ? "bg-gray-900" : ""}
                  `}
                >
                  <OptionIcon className='w-4 h-4' />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function GameRatingInput({
  currentRating,
  onRatingChange,
}: {
  currentRating: string;
  onRatingChange: (rating: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRating, setTempRating] = useState(currentRating);

  const RatingIcon = getRatingIcon(currentRating);
  const ratingStyles = getRatingStyles(currentRating);
  const ratingLabel = getRatingLabel(currentRating);

  const handleSave = () => {
    if (
      tempRating === "N/A" ||
      (Number(tempRating) >= 0 &&
        Number(tempRating) <= 100 &&
        !isNaN(Number(tempRating)))
    ) {
      onRatingChange(tempRating);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempRating(currentRating);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className='flex items-center gap-2'>
        <Input
          type='text'
          value={tempRating}
          onChange={(e) => setTempRating(e.target.value)}
          className='w-24 h-8 text-sm'
          placeholder='N/A or 0-100'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button size='sm' onClick={handleSave} className='h-8 px-2'>
          <Save className='w-3 h-3' />
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={handleCancel}
          className='h-8 px-2'
        >
          <X className='w-3 h-3' />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant='outline'
      onClick={() => setIsEditing(true)}
      className={`flex items-center gap-2 ${ratingStyles} transition-all duration-200 hover:scale-105`}
      title={`${ratingLabel} - Click to edit rating`}
    >
      <RatingIcon className='w-4 h-4' />
      <span className='hidden sm:inline font-medium'>{ratingLabel}:</span>
      <span className='font-bold'>
        {currentRating === "N/A" ? "N/A" : `${currentRating}/100`}
      </span>
      <Edit className='w-3 h-3 opacity-50' />
    </Button>
  );
}

function HowLongToBeatHeader({
  game,
  onOpenDialog,
}: {
  game: GameStoreData;
  onOpenDialog: () => void;
}) {
  const { getSessionData, clearStoredGameData } = useHowLongToBeatWorkflow();

  const [howLongToBeatData, setHowLongToBeatData] =
    useState<HowLongToBeatGame | null>(null);
  const [isLoading] = useState(false);
  const [isDialogOpen] = useState(false);
  const [, setSearchQuery] = useState(game.name);

  // Debug logging
  useEffect(() => {
    console.log("Dialog state changed:", isDialogOpen);
  }, [isDialogOpen]);

  useEffect(() => {
    const existingData = getSessionData(String(game.appId));
    if (existingData) {
      setHowLongToBeatData(existingData);
    }
  }, [game.appId, getSessionData]);

  useEffect(() => {
    setSearchQuery(game.name);
  }, [game.name]);

  // const handleFetchHowLongToBeat = async (gameName: string) => {
  //   setIsLoading(true);
  //   setIsDialogOpen(false);
  //   try {
  //     const selectedGame = await executeHowLongToBeatWorkflow(
  //       String(game.appId),
  //       gameName
  //     );
  //     if (selectedGame) {
  //       setHowLongToBeatData(selectedGame);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching HowLongToBeat data:", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleClearData = async () => {
    await clearStoredGameData(String(game.appId));
    setHowLongToBeatData(null);
  };

  // const handleSearch = () => {
  //   if (searchQuery.trim()) {
  //     handleFetchHowLongToBeat(searchQuery.trim());
  //   }
  // };

  // const handleDialogClose = () => {
  //   setIsDialogOpen(false);
  //   setSearchQuery(game.name); // Reset to original game name
  // };

  const getCompletionData = () => [
    {
      label: "Main Story",
      time: howLongToBeatData?.comp_main || 0,
      count: howLongToBeatData?.comp_main_count || 0,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Main + Extra",
      time: howLongToBeatData?.comp_plus || 0,
      count: howLongToBeatData?.comp_plus_count || 0,
      icon: Zap,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Completionist",
      time: howLongToBeatData?.comp_100 || 0,
      count: howLongToBeatData?.comp_100_count || 0,
      icon: Target,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "All Styles",
      time: howLongToBeatData?.comp_all || 0,
      count: howLongToBeatData?.comp_all_count || 0,
      icon: Trophy,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  // const SearchDialog = () => {
  //   console.log("SearchDialog render, isDialogOpen:", isDialogOpen);

  //   if (!isDialogOpen) return null;

  //   return (
  //     <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //       <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
  //         <div className='flex items-center gap-2 mb-4'>
  //           <Search className='w-5 h-5' />
  //           <h3 className='text-lg font-semibold'>Search HowLongToBeat</h3>
  //         </div>
  //         <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
  //           Enter the game name to search for completion time data. You can
  //           modify the name if needed for better search results.
  //         </p>

  //         <div className='space-y-4'>
  //           <div>
  //             <label className='text-sm font-medium mb-2 block'>
  //               Game Name
  //             </label>
  //             <Input
  //               value={searchQuery}
  //               onChange={(e) => setSearchQuery(e.target.value)}
  //               placeholder='Enter game name...'
  //               className='w-full'
  //               onKeyDown={(e) => {
  //                 if (e.key === "Enter" && searchQuery.trim()) {
  //                   handleSearch();
  //                 }
  //               }}
  //               autoFocus
  //             />
  //             <p className='text-xs text-gray-500 mt-1'>
  //               Tip: Try removing subtitles or year suffixes for better results
  //             </p>
  //           </div>
  //         </div>

  //         <div className='flex gap-2 mt-6'>
  //           <Button
  //             variant='outline'
  //             onClick={handleDialogClose}
  //             className='flex-1'
  //           >
  //             Cancel
  //           </Button>
  //           <Button
  //             onClick={handleSearch}
  //             disabled={!searchQuery.trim() || isLoading}
  //             className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex-1'
  //           >
  //             {isLoading ? (
  //               <>
  //                 <motion.div
  //                   className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
  //                   animate={{ rotate: 360 }}
  //                   transition={{
  //                     duration: 1,
  //                     repeat: Infinity,
  //                     ease: "linear",
  //                   }}
  //                 />
  //                 Searching...
  //               </>
  //             ) : (
  //               <>
  //                 <Search className='w-4 h-4 mr-2' />
  //                 Search
  //               </>
  //             )}
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  if (!howLongToBeatData) {
    return (
      <Card className='w-full'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                <Clock className='w-5 h-5 text-white' />
              </div>
              <div>
                <CardTitle className='text-xl'>HowLongToBeat</CardTitle>
                <CardDescription>
                  Get completion time estimates for this game
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                console.log("Button clicked, opening dialog");
                onOpenDialog();
              }}
              className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
            >
              {isLoading ? (
                <>
                  <motion.div
                    className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  Searching...
                </>
              ) : (
                <>
                  <Search className='w-4 h-4 mr-2' />
                  Search HowLongToBeat
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const completionData = getCompletionData();

  return (
    <>
      <Card className='w-full'>
        <CardHeader>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-black rounded-lg flex items-center justify-center'>
                <img src='/hltb_brand.webp' alt='' />
              </div>
              <div>
                <CardTitle className='text-xl'>HowLongToBeat</CardTitle>
                <CardDescription>
                  Completion times for {howLongToBeatData.game_name}
                </CardDescription>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  console.log("Update button clicked, opening dialog");
                  onOpenDialog();
                }}
              >
                <RotateCcw className='w-4 h-4 mr-2' />
                Update
              </Button>
              <Button variant='outline' size='sm' onClick={handleClearData}>
                <X className='w-4 h-4 mr-2' />
                Clear
              </Button>
              <Button variant='ghost' size='sm' asChild>
                <a
                  href={`https://howlongtobeat.com/game/${howLongToBeatData.game_id}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1'
                >
                  <ExternalLink className='w-4 h-4' />
                  HLTB
                </a>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {completionData.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${item.bgColor} rounded-lg p-4 text-center border`}
                >
                  <div
                    className={`flex items-center justify-center gap-1 text-sm font-medium mb-2 ${item.color}`}
                  >
                    <Icon className='w-4 h-4' />
                    {item.label}
                  </div>
                  <div className='text-2xl font-bold text-foreground mb-1'>
                    {formatPlayTime(item.time)}
                  </div>
                  {item.count > 0 && (
                    <div className='flex items-center justify-center gap-1 text-xs text-muted-foreground'>
                      <Users className='w-3 h-3' />
                      {item.count.toLocaleString()} players
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {howLongToBeatData.profile_dev && (
            <div className='flex flex-wrap items-center gap-2 mt-4 pt-4 border-t'>
              <Badge variant='outline' className='text-xs'>
                {howLongToBeatData.game_type}
              </Badge>
              <span className='text-sm text-muted-foreground'>
                by {howLongToBeatData.profile_dev}
              </span>
              {howLongToBeatData.profile_platform && (
                <Badge variant='secondary' className='text-xs'>
                  <Gamepad2 className='w-3 h-3 mr-1' />
                  {howLongToBeatData.profile_platform}
                </Badge>
              )}
              {howLongToBeatData.release_world > 0 && (
                <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                  <Calendar className='w-3 h-3' />
                  <span>{howLongToBeatData.release_world}</span>
                </div>
              )}
              {howLongToBeatData.review_score > 0 && (
                <div className='flex items-center gap-1 text-sm'>
                  <Star className='w-3 h-3 fill-amber-400 text-amber-400' />
                  <span className='font-medium'>
                    {howLongToBeatData.review_score}/10
                  </span>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
    </>
  );
}
