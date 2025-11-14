import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { TIER_CONFIGS } from "@/lib/ranking-system";
import type { AchievementTier } from "@/lib/ranking-system";

interface SystemScoreAchievementProps {
  achievement: {
    achievement?: {
      displayName?: string;
      icon?: string;
    };
    tier: AchievementTier;
    score: number;
  };
  index: number;
}

export function SystemScoreAchievement({
  achievement,
  index,
}: SystemScoreAchievementProps) {
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tierConfig = TIER_CONFIGS[achievement.tier];

  useEffect(() => {
    const loadIcon = async () => {
      try {
        setIsLoading(true);
        if (achievement.achievement?.icon) {
          const loadedIcon = await invoke<string>("load_image", {
            path: achievement.achievement.icon,
          });
          setIcon(loadedIcon);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    loadIcon();
  }, [achievement.achievement?.icon]);

  const formatScore = (score: number): string => {
    if (isNaN(score) || score === 0) return "0";
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className='flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border hover:shadow-md transition-shadow'
    >
      <div
        className='w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden'
        style={{
          background: `linear-gradient(135deg, ${tierConfig.colors.background})`,
        }}
      >
        {isLoading ? (
          <div className='w-6 h-6 bg-gray-300 dark:bg-gray-600 animate-pulse rounded' />
        ) : icon ? (
          <img
            src={icon}
            alt={achievement.achievement?.displayName || "Achievement"}
            className='w-full h-full object-cover'
          />
        ) : (
          (() => {
            const IconComponent = tierConfig.icon;
            return (
              <IconComponent className={`w-5 h-5 ${tierConfig.colors.text}`} />
            );
          })()
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <div className='text-sm font-medium text-foreground truncate'>
          {achievement.achievement?.displayName || "Achievement"}
        </div>
        <div className='text-xs text-muted-foreground flex items-center gap-1'>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${tierConfig.colors.text}`}
            style={{
              background: `linear-gradient(135deg, ${tierConfig.colors.background})`,
              color: "white",
            }}
          >
            {achievement.tier}
          </span>
          <span>•</span>
          <span>{formatScore(achievement.score)} pts</span>
        </div>
      </div>
    </motion.div>
  );
}
