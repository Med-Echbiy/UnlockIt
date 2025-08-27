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
  RotateCcw,
  Gem,
  Award,
  Crown,
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
