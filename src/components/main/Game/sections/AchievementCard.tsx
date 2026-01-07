import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Unlock, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { getTierByPercentage, TIER_CONFIGS } from "@/lib/ranking-system";
import type { AchievementTier } from "@/lib/ranking-system";
import { Achievement } from "@/types/achievements";
import { GameStoreData } from "@/types/Game";

export function AchievementCard({
  achievement,
}: {
  achievement: Achievement & {
    calculatedScore?: number;
    scoreTier?: string;
    baseScore?: number;
    percentage?: number;
  };
  game: GameStoreData;
}) {
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

  // Format unlock time
  const formatUnlockTime = (timestamp: string | undefined) => {
    if (!timestamp || timestamp === "0") return null;
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unlockTime = formatUnlockTime(achievement.achievedAt);

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

              {/* Achievement Status, Tier & Score */}
              <div className='flex flex-col gap-2'>
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

                {/* Unlock Time and Score */}
                {isUnlocked && (
                  <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                    {unlockTime && (
                      <div className='flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        <span>{unlockTime}</span>
                      </div>
                    )}
                    {achievement.percentage !== undefined && (
                      <div className='flex items-center gap-1'>
                        <span className='opacity-70'>
                          {achievement.percentage}% of players
                        </span>
                      </div>
                    )}
                    {achievement.calculatedScore &&
                      achievement.calculatedScore > 0 && (
                        <div className='flex items-center gap-1'>
                          <Trophy className='w-3 h-3 text-yellow-500' />
                          <span className='font-semibold text-yellow-600 dark:text-yellow-400'>
                            {achievement.calculatedScore.toLocaleString()}{" "}
                            points
                          </span>
                          <span className='text-xs opacity-70'>
                            ({achievement.scoreTier})
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}
