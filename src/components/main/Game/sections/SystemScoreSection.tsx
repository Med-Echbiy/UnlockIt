import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useAchievementsStore from "@/store/achievements-store";
import useScoringSystemWorkflow from "@/workflow/scoring-system-worfklow";
import { useGameCardTier } from "@/hooks/use-ranking";
import { SystemScoreAchievement } from "../system-score-achievement";
import { GameStoreData } from "@/types/Game";
import { GameScore } from "@/types/scoring";

export function SystemScoreSection({ game }: { game: GameStoreData }) {
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
      <Card className='w-full border-border/50'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
              <BarChart3 className='w-8 h-8 text-white animate-pulse' />
            </div>
            <div>
              <CardTitle className='text-3xl font-black'>
                System Score
              </CardTitle>
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
      <Card className='w-full border-border/50'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted-foreground/50 flex items-center justify-center'>
              <BarChart3 className='w-8 h-8 text-white' />
            </div>
            <div>
              <CardTitle className='text-3xl font-black'>
                System Score
              </CardTitle>
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
    <Card className='w-full border-border/50'>
      <CardHeader>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className='flex items-center justify-between'
        >
          <div className='flex items-center gap-4'>
            <div
              className='w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg'
              style={{
                background: `linear-gradient(135deg, ${tierConfig.colors.background})`,
              }}
            >
              <BarChart3 className='w-8 h-8 text-white' />
            </div>
            <div>
              <CardTitle className='text-3xl font-black'>
                System Score
              </CardTitle>
              <CardDescription>
                Performance analysis for {game.name}
              </CardDescription>
            </div>
          </div>
        </motion.div>

        <div className='grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6'>
          {/* Total Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", stiffness: 300 }}
            className='relative rounded-2xl p-6 bg-gradient-to-br from-blue-500 to-blue-400 overflow-hidden'
          >
            <motion.div
              className='absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full'
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className='relative z-10'>
              <TrendingUp className='w-8 h-8 text-white mb-3' />
              <div className='text-sm font-bold text-white/80 mb-2'>
                TOTAL SCORE
              </div>
              <div className='text-4xl font-black text-white mb-1'>
                {formatScore(Math.round(gameScore.totalGameScore || 0))}
              </div>
              <div className='text-xs text-white/70'>points earned</div>
            </div>
          </motion.div>

          {/* Completion Percentage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05, rotate: -2 }}
            className='relative rounded-2xl p-6 bg-gradient-to-br from-emerald-500 to-green-400 overflow-hidden'
          >
            <motion.div
              className='absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full'
              animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />
            <div className='relative z-10'>
              <Target className='w-8 h-8 text-white mb-3' />
              <div className='text-sm font-bold text-white/80 mb-2'>
                COMPLETION
              </div>
              <div className='text-4xl font-black text-white mb-1'>
                {(gameScore.completionPercentage || 0).toFixed(1)}%
              </div>
              <div className='text-xs text-white/70'>game progress</div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
            className='relative rounded-2xl p-6 bg-gradient-to-br from-amber-500 to-orange-400 overflow-hidden'
          >
            <motion.div
              className='absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full'
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 2 }}
            />
            <div className='relative z-10'>
              <Trophy className='w-8 h-8 text-white mb-3' />
              <div className='text-sm font-bold text-white/80 mb-2'>
                ACHIEVEMENTS
              </div>
              <div className='text-4xl font-black text-white mb-1'>
                {gameScore.achievements?.length || 0}
              </div>
              <div className='text-xs text-white/70'>unlocked</div>
            </div>
          </motion.div>

          {/* Achievement Tier Position */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05, rotate: -2 }}
            className='relative rounded-2xl p-6 bg-gradient-to-br from-purple-500 to-purple-400 overflow-hidden'
          >
            <motion.div
              className='absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full'
              animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 3 }}
            />
            <div className='relative z-10'>
              {(() => {
                const IconComponent = tierConfig.icon;
                return <IconComponent className='w-8 h-8 text-white mb-3' />;
              })()}
              <div className='text-sm font-bold text-white/80 mb-2'>TIER</div>
              <div className='text-3xl font-black text-white mb-1'>
                {tierConfig.name}
              </div>
              <div className='text-xs text-white/70'>current rank</div>
            </div>
          </motion.div>
        </div>

        {/* Achievement Breakdown */}
        {gameScore.achievements && gameScore.achievements.length > 0 && (
          <div className='mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border'>
            <h4 className='text-sm font-semibold mb-3 text-foreground'>
              Recent Achievements
            </h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
              {gameScore.achievements
                .filter((a) => a.achievement.defaultvalue === 1)
                .sort((a, b) => {
                  const timeA = a.achievement.achievedAt
                    ? parseInt(a.achievement.achievedAt)
                    : 0;
                  const timeB = b.achievement.achievedAt
                    ? parseInt(b.achievement.achievedAt)
                    : 0;
                  return timeB - timeA;
                })
                .slice(0, 6)
                .map((achievement, index: number) => (
                  <SystemScoreAchievement
                    key={achievement.achievement.name || index}
                    achievement={achievement}
                    index={index}
                  />
                ))}
            </div>
            {gameScore.achievements.filter(
              (a) => a.achievement.defaultvalue === 1
            ).length > 6 && (
              <div className='text-center mt-3'>
                <Badge variant='outline' className='text-xs'>
                  +
                  {gameScore.achievements.filter(
                    (a) => a.achievement.defaultvalue === 1
                  ).length - 6}{" "}
                  more achievements
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
