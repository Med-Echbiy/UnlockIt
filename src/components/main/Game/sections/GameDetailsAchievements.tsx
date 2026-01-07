import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Trophy, Star, Trash, GamepadIcon } from "lucide-react";
import useAchievementsStore from "@/store/achievements-store";
import useScoringSystemWorkflow from "@/workflow/scoring-system-worfklow";
import useParsingWorkflow from "@/workflow/parser/parse-workflow";
import useResetAchievementsWorkflow from "@/workflow/reset-achievements-workflow";
import useSilentPercentageRefreshWorkflow from "@/workflow/silent-percentage-refresh-workflow";
import useUIStateStore from "@/store/ui-state-store";
import { GameStoreData } from "@/types/Game";
import { AchievementCard } from "./AchievementCard";
import { RefreshButton } from "./RefreshButton";
import { detectCrackType } from "./utils";

export function GameDetailsAchievements({ game }: { game: GameStoreData }) {
  const { getTrackedAchievementsFiles } = useAchievementsStore();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rarity" | "default">("rarity");
  const { calculateAchievementScore } = useScoringSystemWorkflow();

  // Get crack type information
  const trackedFiles = getTrackedAchievementsFiles();
  const gameTrackedFile = trackedFiles.find(
    (file) => file.appid === game.appId
  );
  const crackInfo = gameTrackedFile
    ? detectCrackType(gameTrackedFile.filePath)
    : null;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate scores for achievements
  const achievementsWithScores = achievements.map((achievement, index) => {
    // Calculate base score from rarity percentage
    const percentage = parseFloat(achievement.percent || "100");
    let baseScore = 10; // default
    if (percentage >= 80) baseScore = 10;
    else if (percentage >= 50) baseScore = 25;
    else if (percentage >= 25) baseScore = 50;
    else if (percentage >= 10) baseScore = 100;
    else if (percentage >= 3) baseScore = 250;
    else if (percentage >= 1) baseScore = 500;
    else if (percentage >= 0.5) baseScore = 750;
    else baseScore = 1000;

    // Log each achievement with its base score
    console.log(
      `[Achievement] ${achievement.displayName || achievement.name}:`,
      {
        baseScore,
        percentage: `${percentage}%`,
        unlocked: achievement.defaultvalue === 1,
      }
    );

    if (achievement.defaultvalue === 1) {
      const { score, tier } = calculateAchievementScore(
        achievement,
        game.name,
        game.release_date.date,
        index,
        achievements,
        game
      );
      return {
        ...achievement,
        calculatedScore: score,
        scoreTier: tier,
        baseScore,
        percentage,
      };
    }
    return {
      ...achievement,
      calculatedScore: 0,
      scoreTier: "Common",
      baseScore,
      percentage,
    };
  });

  // Filter and search achievements
  let filteredAchievements = !Array.isArray(achievementsWithScores)
    ? []
    : filter === "all"
    ? achievementsWithScores
    : filter === "unlocked"
    ? achievementsWithScores.filter((a) => a?.defaultvalue === 1)
    : filter === "locked"
    ? achievementsWithScores.filter((a) => a?.defaultvalue === 0)
    : achievementsWithScores.filter((a) => a?.hidden === 1);

  // Apply search filter
  if (searchQuery.trim()) {
    filteredAchievements = filteredAchievements.filter(
      (a) =>
        a.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply sorting
  if (sortBy === "default") {
    filteredAchievements = [...filteredAchievements].sort(
      (a, b) => (a.percentage || 100) - (b.percentage || 100)
    );
  } else {
    filteredAchievements = [...filteredAchievements].sort(
      (a, b) => (b.percentage || 100) - (a.percentage || 100)
    );
  }
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
      } else {
        // Also refresh percentages from Steam API
        await manualRefreshPercentages();
        toast.success(
          "Achievement files and percentages refreshed successfully!"
        );
      }
    } catch (error) {
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
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>
                  {total > 0
                    ? `You Have Unlocked ${unlocked} of ${total}`
                    : "No achievements found for this game."}
                </CardDescription>
              </div>

              {/* Crack Type Badge */}
              {crackInfo && (
                <div className='flex flex-col gap-1 items-end'>
                  <Badge
                    className={`${crackInfo.color} text-white border-0 px-3 py-1`}
                  >
                    <GamepadIcon className='w-3 h-3 mr-1' />
                    {crackInfo.displayName}
                  </Badge>
                  {gameTrackedFile && (
                    <span
                      className='text-xs text-muted-foreground max-w-md truncate'
                      title={gameTrackedFile.filePath}
                    >
                      Tracking:{" "}
                      {gameTrackedFile.filePath.split("\\").pop() ||
                        gameTrackedFile.filePath.split("/").pop()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {total > 0 && (
              <>
                {/* Search Bar */}
                <div className='mt-3'>
                  <Input
                    type='text'
                    placeholder='Search achievements by name...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full'
                  />
                </div>

                <div className='flex justify-between items-center gap-2 flex-wrap'>
                  <div className='flex gap-2 mt-2 flex-wrap'>
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
                    <Separator orientation='vertical' className='h-8' />
                    <Button
                      size='sm'
                      variant={sortBy === "rarity" ? "default" : "outline"}
                      onClick={() =>
                        setSortBy(sortBy === "rarity" ? "default" : "rarity")
                      }
                    >
                      <Trophy className='w-3 h-3 mr-1' />
                      Rarity (Low to High)
                    </Button>
                    <Button
                      size='sm'
                      variant={sortBy === "default" ? "default" : "outline"}
                      onClick={() =>
                        setSortBy(sortBy === "default" ? "rarity" : "default")
                      }
                    >
                      <Star className='w-3 h-3 mr-1' />
                      Rarity (High to Low)
                    </Button>
                  </div>
                  <div className='flex items-center gap-2 flex-wrap'>
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
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {total > 0 ? (
            filteredAchievements.length > 0 ? (
              filteredAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement?.name}
                  achievement={achievement}
                  game={game}
                />
              ))
            ) : (
              <div className='col-span-full text-center text-muted-foreground py-8'>
                <Search className='w-12 h-12 mx-auto mb-2 opacity-50' />
                No achievements match your search
              </div>
            )
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
