import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import useRustTrackPlaytimeWorkflow from "@/workflow/rust-track-playtime-workflow";
import useHowLongToBeatWorkflow from "@/workflow/how-long-to-beat-workflow";
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
  Filter,
  SlidersHorizontal,
  ChevronDown,
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
import useUpdateGameWorkflow from "@/workflow/update-game-workflow";
import { Input } from "@/components/ui/input";
import { formatPlayTime } from "@/lib/howLongToBeatHelper";

function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const game = useMyGamesStore((state) => state.getGameById(id as string));

  if (!game) {
    return <></>;
  }

  return (
    <main className='w-full min-h-screen p-2'>
      {game && (
        <Card className='grid grid-cols-1 p-3 gap-5 bg-transparent border-none  shadow-none'>
          <GameDetailsHeader id={id!} />
          <Separator />
          <GameFiltersSection />
          <Separator />
          <HowLongToBeatHeader game={game} />
          <Separator />
          <GameDetailsAchievements game={game} />
        </Card>
      )}
    </main>
  );
}

export default GameDetails;

function GameDetailsHeader({ id }: { id: string }) {
  const game = useMyGamesStore((state) => state.getGameById(id as string));
  const { setGameStatus, setGameRating } = useUpdateGameWorkflow();

  const { playtime, isRunning, startTracking, stopTracking } =
    useRustTrackPlaytimeWorkflow(String(game!.appId), game!.exePath);
  const [coverImg, setCoverImage] = useState<string | null>(null);
  // const [backgroundImg, setBackgroundImage] = useState<string | null>(null);
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
        // setBackgroundImage(
        //   await invoke("load_image", {
        //     path: game.background,
        //   })
        // );
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
                  onClick={() => startTracking()}
                >
                  <div className='flex items-center gap-2'>
                    <Play />
                    Play
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
              <Button className='flex items-center gap-2' variant='outline'>
                <Clock />
                <span>
                  Time Played: {Math.floor(playtime / 60)}m {playtime % 60}s
                </span>
              </Button>
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

  const filteredAchievements = !Array.isArray(achievements)
    ? []
    : filter === "all"
    ? achievements
    : filter === "unlocked"
    ? achievements.filter((a) => a?.defaultvalue === 1)
    : filter === "locked"
    ? achievements.filter((a) => a?.defaultvalue === 0)
    : achievements.filter((a) => a?.hidden === 1);
  //------------
  const { parseAchievements } = useParsingWorkflow({
    appid: game.appId,
    exePath: game.exePath,
  });
  const { resetAchievements } = useResetAchievementsWorkflow(game.appId);
  const { setConfirmationModal, confirmationModal } = useUIStateStore();
  function onReset() {
    setConfirmationModal(true, "reset achievements", () => {
      resetAchievements();
      confirmationModal.onCancel();
    });
  }
  // useEffect(() => {
  //   parseAchievements();
  // }, []);
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
                  <Button onClick={() => parseAchievements()}>
                    Refresh Achievements
                    <RefreshCcw />
                  </Button>
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

  useEffect(() => {
    (async () => {
      if (achievement.defaultvalue === 0 && achievement.hidden === 1) {
        setIcon(await invoke("load_image", { path: achievement.icongray }));
      } else {
        setIcon(await invoke("load_image", { path: achievement.icon }));
      }
    })();
  }, []);

  const isUnlocked = achievement.defaultvalue === 1;
  const isHidden = achievement.hidden === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className='group'
    >
      <Card
        className={`
        relative overflow-hidden border-0 bg-gradient-to-br transition-all duration-300
        ${
          isUnlocked
            ? "from-amber-500/10 via-yellow-500/5 to-orange-500/10 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30"
            : "from-slate-800/50 via-slate-700/30 to-slate-600/20 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30"
        }
        backdrop-blur-sm group-hover:scale-[1.02] transition-transform duration-300
      `}
      >
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

        <div className='absolute top-3 right-3'>
          {isUnlocked ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Trophy className='w-4 h-4 text-amber-400' />
            </motion.div>
          ) : (
            <Star className='w-4 h-4 text-slate-500' />
          )}
        </div>

        <CardHeader className='p-4'>
          <div className='flex items-start gap-4'>
            <div
              className={`
              relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden
              ${
                isUnlocked
                  ? "bg-gradient-to-br from-amber-400/20 to-orange-500/20 ring-2 ring-amber-400/30"
                  : "bg-gradient-to-br from-slate-600/20 to-slate-700/20 ring-2 ring-slate-500/30"
              }
              transition-all duration-300 group-hover:ring-4
              ${
                isUnlocked
                  ? "group-hover:ring-amber-400/50"
                  : "group-hover:ring-slate-400/50"
              }
            `}
            >
              {icon && (
                <motion.img
                  src={icon}
                  alt={achievement.name}
                  className='w-full h-full object-cover'
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                />
              )}
              {!icon && (
                <div className='w-full h-full bg-slate-700/50 animate-pulse rounded-lg flex items-center justify-center'>
                  <Trophy className='w-6 h-6 text-slate-500' />
                </div>
              )}

              {isUnlocked && (
                <div className='absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              )}
            </div>

            <div className='flex-1 min-w-0 space-y-3'>
              <div className='space-y-1'>
                <h3
                  className={`
                  font-semibold text-lg leading-tight
                  ${isUnlocked ? "text-amber-100" : "text-slate-300"}
                  group-hover:text-white transition-colors duration-300
                `}
                >
                  {achievement.displayName}
                </h3>

                <p
                  className={`
                  text-sm leading-relaxed
                  ${isUnlocked ? "text-amber-200/80" : "text-slate-400"}
                  group-hover:text-slate-200 transition-colors duration-300
                `}
                >
                  {isHidden && !isUnlocked
                    ? "Hidden Achievement"
                    : achievement.description}
                </p>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                <Badge
                  className={`
                    px-3 py-1 text-xs font-medium rounded-full border-0 transition-all duration-300
                    ${
                      isUnlocked
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
                        : "bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 shadow-lg shadow-black/30 hover:shadow-black/50"
                    }
                    group-hover:scale-105
                  `}
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
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

// Status icons mapping
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

// Status colors mapping
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

// Rating styling helpers
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

// Game Status Selector Component
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

// Game Rating Input Component
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
    // Validate rating (should be N/A or number between 0-100)
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

// Game Filters Section Component
function GameFiltersSection() {
  const games = useMyGamesStore((state) => state.games);
  const [filters, setFilters] = useState({
    status: "all" as GameStoreData["status"] | "all",
    rating: "all" as
      | "all"
      | "na"
      | "red"
      | "bronze"
      | "silver"
      | "gold"
      | "diamond",
    metacritic: "all" as "all" | "high" | "medium" | "low" | "none",
    genre: "all" as string,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique genres from all games
  const allGenres = games.flatMap((game) => game.genres);
  const uniqueGenres = Array.from(
    new Set(allGenres.map((genre) => genre.description))
  ).sort();

  // Filter games based on current filters
  const filteredGames = games.filter((game) => {
    // Status filter
    if (filters.status !== "all" && game.status !== filters.status) {
      return false;
    }

    // Rating filter
    if (filters.rating !== "all") {
      const gameTier = getRatingTier(game.my_rating);
      if (gameTier !== filters.rating) {
        return false;
      }
    }

    // Metacritic filter
    if (filters.metacritic !== "all") {
      const score = game.metacritic?.score || 0;
      switch (filters.metacritic) {
        case "high":
          if (score < 80) return false;
          break;
        case "medium":
          if (score < 60 || score >= 80) return false;
          break;
        case "low":
          if (score < 40 || score >= 60) return false;
          break;
        case "none":
          if (score > 0) return false;
          break;
      }
    }

    // Genre filter
    if (filters.genre !== "all") {
      const hasGenre = game.genres.some(
        (genre) => genre.description === filters.genre
      );
      if (!hasGenre) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      status: "all",
      rating: "all",
      metacritic: "all",
      genre: "all",
    });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.rating !== "all" ||
    filters.metacritic !== "all" ||
    filters.genre !== "all";

  return (
    <Card className='w-full'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <SlidersHorizontal className='w-5 h-5 text-white' />
            </div>
            <div>
              <CardTitle className='text-xl'>Game Filters</CardTitle>
              <CardDescription>
                Filter your games by status, rating, score, and genre
              </CardDescription>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-sm'>
              {filteredGames.length} of {games.length} games
            </Badge>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='flex items-center gap-2'
            >
              <Filter className='w-4 h-4' />
              {isExpanded ? "Hide" : "Show"} Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Status Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Status</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value as any,
                  }))
                }
                className='w-full p-2 border rounded-md bg-background text-foreground'
              >
                <option value='all'>All Statuses</option>
                <option value='not-played'>Not Played</option>
                <option value='playing'>Playing</option>
                <option value='played'>Played</option>
                <option value='completed'>Completed</option>
                <option value='beaten'>Beaten</option>
                <option value='trash'>Trash</option>
              </select>
            </div>

            {/* My Rating Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>My Rating</label>
              <select
                value={filters.rating}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    rating: e.target.value as any,
                  }))
                }
                className='w-full p-2 border rounded-md bg-background text-foreground'
              >
                <option value='all'>All Ratings</option>
                <option value='na'>N/A</option>
                <option value='red'>Poor (0-10)</option>
                <option value='bronze'>Fair (11-30)</option>
                <option value='silver'>Good (31-60)</option>
                <option value='gold'>Great (61-90)</option>
                <option value='diamond'>Masterpiece (91-100)</option>
              </select>
            </div>

            {/* Metacritic Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Metacritic Score</label>
              <select
                value={filters.metacritic}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    metacritic: e.target.value as any,
                  }))
                }
                className='w-full p-2 border rounded-md bg-background text-foreground'
              >
                <option value='all'>All Scores</option>
                <option value='high'>High (80+)</option>
                <option value='medium'>Medium (60-79)</option>
                <option value='low'>Low (40-59)</option>
                <option value='none'>No Score</option>
              </select>
            </div>

            {/* Genre Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Genre</label>
              <select
                value={filters.genre}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, genre: e.target.value }))
                }
                className='w-full p-2 border rounded-md bg-background text-foreground'
              >
                <option value='all'>All Genres</option>
                {uniqueGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className='flex flex-wrap gap-2 pt-2 border-t'>
            <Button
              size='sm'
              variant='outline'
              onClick={() =>
                setFilters((prev) => ({ ...prev, status: "playing" }))
              }
              className='flex items-center gap-1'
            >
              <GamepadIcon className='w-3 h-3' />
              Currently Playing
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() =>
                setFilters((prev) => ({ ...prev, status: "completed" }))
              }
              className='flex items-center gap-1'
            >
              <Trophy className='w-3 h-3' />
              Completed
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() =>
                setFilters((prev) => ({ ...prev, rating: "gold" }))
              }
              className='flex items-center gap-1'
            >
              <Star className='w-3 h-3' />
              Highly Rated
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() =>
                setFilters((prev) => ({ ...prev, metacritic: "high" }))
              }
              className='flex items-center gap-1'
            >
              <Medal className='w-3 h-3' />
              High Metacritic
            </Button>
            {hasActiveFilters && (
              <Button
                size='sm'
                variant='ghost'
                onClick={resetFilters}
                className='flex items-center gap-1 text-muted-foreground hover:text-foreground'
              >
                <RotateCcw className='w-3 h-3' />
                Clear All
              </Button>
            )}
          </div>

          {/* Filtered Games Display */}
          {filteredGames.length > 0 && (
            <div className='pt-4 border-t'>
              <h4 className='font-medium mb-3 text-sm text-muted-foreground'>
                Filtered Games ({filteredGames.length})
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'>
                {filteredGames.slice(0, 12).map((game) => (
                  <FilteredGameCard key={game.appId} game={game} />
                ))}
                {filteredGames.length > 12 && (
                  <div className='flex items-center justify-center p-4 border-2 border-dashed border-muted rounded-lg text-muted-foreground text-sm'>
                    +{filteredGames.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Small game card for filtered results
function FilteredGameCard({ game }: { game: GameStoreData }) {
  const [coverImg, setCoverImage] = useState<string | null>(null);
  const StatusIcon = getStatusIcon(game.status);
  const RatingIcon = getRatingIcon(game.my_rating);

  useEffect(() => {
    (async () => {
      try {
        const img = await invoke("load_image", {
          path: game.header_image,
        });
        setCoverImage(img as string);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    })();
  }, [game.header_image]);

  return (
    <div className='group relative bg-card rounded-lg overflow-hidden border hover:border-primary/50 transition-all duration-200 hover:scale-105'>
      <div className='aspect-[16/9] relative overflow-hidden'>
        {coverImg ? (
          <img
            src={coverImg}
            alt={game.name}
            className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
          />
        ) : (
          <div className='w-full h-full bg-muted animate-pulse flex items-center justify-center'>
            <GamepadIcon className='w-6 h-6 text-muted-foreground' />
          </div>
        )}

        {/* Status overlay */}
        <div className='absolute top-2 left-2'>
          <StatusIcon
            className={`w-4 h-4 ${getStatusColor(game.status).split(" ")[0]}`}
          />
        </div>

        {/* Rating overlay */}
        <div className='absolute top-2 right-2'>
          <RatingIcon
            className={`w-4 h-4 ${
              getRatingStyles(game.my_rating).split(" ")[0]
            }`}
          />
        </div>

        {/* Metacritic score */}
        {game.metacritic?.score && (
          <div className='absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded'>
            {game.metacritic.score}
          </div>
        )}
      </div>

      <div className='p-2'>
        <h4 className='font-medium text-sm truncate' title={game.name}>
          {game.name}
        </h4>
        <div className='flex flex-wrap gap-1 mt-1'>
          {game.genres.slice(0, 2).map((genre) => (
            <Badge
              key={genre.id}
              variant='secondary'
              className='text-xs px-1 py-0'
            >
              {genre.description}
            </Badge>
          ))}
          {game.genres.length > 2 && (
            <Badge variant='secondary' className='text-xs px-1 py-0'>
              +{game.genres.length - 2}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function HowLongToBeatHeader({ game }: { game: GameStoreData }) {
  const { executeHowLongToBeatWorkflow, getSessionData, clearStoredGameData } =
    useHowLongToBeatWorkflow();

  const [howLongToBeatData, setHowLongToBeatData] =
    useState<HowLongToBeatGame | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing data on component mount
  useEffect(() => {
    const existingData = getSessionData(String(game.appId));
    if (existingData) {
      setHowLongToBeatData(existingData);
    }
  }, [game.appId, getSessionData]);

  const handleFetchHowLongToBeat = async () => {
    setIsLoading(true);
    try {
      const selectedGame = await executeHowLongToBeatWorkflow(
        String(game.appId),
        game.name
      );
      if (selectedGame) {
        setHowLongToBeatData(selectedGame);
      }
    } catch (error) {
      console.error("Error fetching HowLongToBeat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    await clearStoredGameData(String(game.appId));
    setHowLongToBeatData(null);
  };

  // const formatTime = (minutes: number): string => {
  //   if (minutes === 0) return "N/A";
  //   const hours = Math.floor(minutes / 60 / 60);
  //   const mins = minutes % 60;
  //   if (hours === 0) return `${mins}m`;
  //   if (mins === 0) return `${hours}h`;
  //   return `${hours}h ${mins}m`;
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
              onClick={handleFetchHowLongToBeat}
              disabled={isLoading}
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
              onClick={handleFetchHowLongToBeat}
              disabled={isLoading}
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
  );
}
