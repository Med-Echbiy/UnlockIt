import React from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  getRankConfig,
  getTierConfig,
  type GameRank,
  type AchievementTier,
  formatScore,
} from "@/lib/ranking-system";

interface RankBadgeProps {
  rank: GameRank;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showDescription?: boolean;
  animated?: boolean;
  className?: string;
}

export function RankBadge({
  rank,
  size = "md",
  showIcon = true,
  showDescription = false,
  animated = false,
  className = "",
}: RankBadgeProps) {
  const config = getRankConfig(rank);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const BadgeComponent = animated ? motion.div : "div";
  const badgeProps = animated
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: { scale: 1.05 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <BadgeComponent {...badgeProps}>
      <Badge
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-r ${config.colors.gradient} 
          text-white border-0 shadow-lg font-bold
          transition-all duration-300 hover:shadow-xl
          ${className}
        `}
        style={{
          boxShadow: `0 0 15px ${config.colors.glow}`,
        }}
      >
        <div className='flex items-center gap-2'>
          {showIcon && <Icon className={iconSizes[size]} />}
          <span>{rank}</span>
          {rank === "Touch Grass" && (
            <div className='w-2 h-2 bg-white/80 rounded-full animate-pulse' />
          )}
        </div>
      </Badge>
      {showDescription && (
        <p className='text-xs text-muted-foreground mt-1 max-w-32 text-center'>
          {config.description}
        </p>
      )}
    </BadgeComponent>
  );
}

interface TierBadgeProps {
  tier: AchievementTier;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

export function TierBadge({
  tier,
  size = "sm",
  showIcon = true,
  animated = false,
  className = "",
}: TierBadgeProps) {
  const config = getTierConfig(tier);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const BadgeComponent = animated ? motion.div : "div";
  const badgeProps = animated
    ? {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: { scale: 1.1 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <BadgeComponent {...badgeProps}>
      <Badge
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-r ${config.colors.gradient} 
          text-white border-0 shadow-md font-medium
          transition-all duration-200 hover:shadow-lg
          ${className}
        `}
      >
        <div className='flex items-center gap-1'>
          {showIcon && <Icon className={iconSizes[size]} />}
          <span>{tier}</span>
        </div>
      </Badge>
    </BadgeComponent>
  );
}

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function ScoreBadge({
  score,
  size = "md",
  showLabel = true,
  animated = false,
  className = "",
}: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const BadgeComponent = animated ? motion.div : "div";
  const badgeProps = animated
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: { scale: 1.05 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <BadgeComponent {...badgeProps}>
      <Badge
        variant='outline'
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-r from-green-500/10 to-emerald-500/10 
          border-green-400/30 text-green-400 font-mono font-bold
          transition-all duration-200 hover:bg-green-500/20
          ${className}
        `}
      >
        <span className='bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
          {formatScore(score)}
        </span>
        {showLabel && <span className='text-muted-foreground ml-1'>pts</span>}
      </Badge>
    </BadgeComponent>
  );
}

interface ProgressBadgeProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBadge({
  percentage,
  size = "md",
  showPercentage = true,
  animated = false,
  className = "",
}: ProgressBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "from-green-500 to-emerald-500";
    if (percentage >= 75) return "from-blue-500 to-cyan-500";
    if (percentage >= 50) return "from-yellow-500 to-amber-500";
    if (percentage >= 25) return "from-orange-500 to-red-500";
    return "from-red-500 to-pink-500";
  };

  const getBorderColor = () => {
    if (percentage >= 90) return "border-green-400/30";
    if (percentage >= 75) return "border-blue-400/30";
    if (percentage >= 50) return "border-yellow-400/30";
    if (percentage >= 25) return "border-orange-400/30";
    return "border-red-400/30";
  };

  const BadgeComponent = animated ? motion.div : "div";
  const badgeProps = animated
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: { scale: 1.05 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <BadgeComponent {...badgeProps}>
      <Badge
        variant='outline'
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-r ${getProgressColor()}/10 
          ${getBorderColor()} font-bold
          transition-all duration-200 hover:${getProgressColor()}/20
          ${className}
        `}
      >
        {showPercentage && (
          <span
            className={`bg-gradient-to-r ${getProgressColor()} bg-clip-text text-transparent`}
          >
            {percentage.toFixed(1)}%
          </span>
        )}
      </Badge>
    </BadgeComponent>
  );
}
