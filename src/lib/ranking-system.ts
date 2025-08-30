import React from "react";
import { Trophy, Star, Target, Award, Crown, Zap, Medal } from "lucide-react";

export type GameRank =
  | "Novice"
  | "Explorer"
  | "Hunter"
  | "Master"
  | "Legend"
  | "Grandmaster"
  | "Touch Grass";

export type AchievementTier =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Mythic";

export interface RankConfig {
  name: GameRank;
  minScore: number;
  minCompletion: number;
  colors: {
    gradient: string;
    border: string;
    text: string;
    background: string;
    particle: string;
    glow: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export interface TierConfig {
  name: AchievementTier;
  minPercentage: number;
  maxPercentage: number;
  colors: {
    gradient: string;
    border: string;
    text: string;
    background: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  baseScore: number;
}

export const RANK_CONFIGS: Record<GameRank, RankConfig> = {
  "Touch Grass": {
    name: "Touch Grass",
    minScore: 200000,
    minCompletion: 98,
    colors: {
      gradient: "from-green-600 via-emerald-500 to-teal-400",
      border: "border-green-400/50",
      text: "text-green-400",
      background: "from-emerald-900/90 via-green-800/85 to-teal-900/90",
      particle: "bg-green-400/30",
      glow: "rgba(34, 197, 94, 0.3)",
    },
    icon: Crown,
    description: "Ultimate gaming mastery achieved. Time to go outside!",
  },
  Grandmaster: {
    name: "Grandmaster",
    minScore: 50000,
    minCompletion: 90,
    colors: {
      gradient: "from-purple-600 to-pink-500",
      border: "border-purple-400/50",
      text: "text-purple-400",
      background: "from-purple-900/85 via-pink-800/80 to-purple-900/85",
      particle: "bg-purple-400/30",
      glow: "rgba(147, 51, 234, 0.3)",
    },
    icon: Trophy,
    description: "Elite gaming",
  },
  Legend: {
    name: "Legend",
    minScore: 25000,
    minCompletion: 75,
    colors: {
      gradient: "from-cyan-400 to-blue-500",
      border: "border-cyan-400/50",
      text: "text-cyan-400",
      background: "from-cyan-900/85 via-blue-800/80 to-cyan-900/85",
      particle: "bg-cyan-400/30",
      glow: "rgba(6, 182, 212, 0.3)",
    },
    icon: Award,
    description: "Legendary achievements and high completion rates",
  },
  Master: {
    name: "Master",
    minScore: 10000,
    minCompletion: 60,
    colors: {
      gradient: "from-rose-500 to-pink-500",
      border: "border-rose-400/50",
      text: "text-rose-400",
      background: "from-rose-900/85 via-pink-800/80 to-rose-900/85",
      particle: "bg-rose-400/30",
      glow: "rgba(244, 63, 94, 0.3)",
    },
    icon: Trophy,
    description: "Skilled player with solid achievements",
  },
  Hunter: {
    name: "Hunter",
    minScore: 5000,
    minCompletion: 40,
    colors: {
      gradient: "from-indigo-500 to-purple-500",
      border: "border-indigo-400/50",
      text: "text-indigo-400",
      background: "from-indigo-900/85 via-purple-800/80 to-indigo-900/85",
      particle: "bg-indigo-400/30",
      glow: "rgba(99, 102, 241, 0.3)",
    },
    icon: Award,
    description: "Active achievement hunter",
  },
  Explorer: {
    name: "Explorer",
    minScore: 1000,
    minCompletion: 20,
    colors: {
      gradient: "from-yellow-500 to-amber-400",
      border: "border-yellow-400/50",
      text: "text-yellow-400",
      background: "from-yellow-900/85 via-amber-800/80 to-yellow-900/85",
      particle: "bg-yellow-400/30",
      glow: "rgba(234, 179, 8, 0.3)",
    },
    icon: Star,
    description: "Beginning to explore gaming achievements",
  },
  Novice: {
    name: "Novice",
    minScore: 0,
    minCompletion: 0,
    colors: {
      gradient: "from-slate-500 to-gray-600",
      border: "border-slate-400/50",
      text: "text-slate-400",
      background: "from-slate-900/90 via-gray-800/85 to-slate-900/90",
      particle: "bg-slate-400/30",
      glow: "rgba(148, 163, 184, 0.3)",
    },
    icon: Target,
    description: "Just starting the gaming journey",
  },
};

export const TIER_CONFIGS: Record<AchievementTier, TierConfig> = {
  Mythic: {
    name: "Mythic",
    minPercentage: 0,
    maxPercentage: 0.5,
    colors: {
      gradient: "from-purple-600 to-pink-500",
      border: "border-purple-400/50",
      text: "text-purple-400",
      background: "from-purple-900/90 to-pink-900/90",
    },
    icon: Crown,
    baseScore: 1000,
  },
  Legendary: {
    name: "Legendary",
    minPercentage: 0.5,
    maxPercentage: 3,
    colors: {
      gradient: "from-amber-500 to-yellow-500",
      border: "border-amber-400/50",
      text: "text-amber-400",
      background: "from-amber-900/90 to-yellow-900/90",
    },
    icon: Trophy,
    baseScore: 500,
  },
  Epic: {
    name: "Epic",
    minPercentage: 3,
    maxPercentage: 10,
    colors: {
      gradient: "from-violet-500 to-purple-600",
      border: "border-violet-400/50",
      text: "text-violet-400",
      background: "from-violet-900/90 to-purple-900/90",
    },
    icon: Award,
    baseScore: 100,
  },
  Rare: {
    name: "Rare",
    minPercentage: 10,
    maxPercentage: 25,
    colors: {
      gradient: "from-blue-500 to-cyan-500",
      border: "border-blue-400/50",
      text: "text-blue-400",
      background: "from-blue-900/90 to-cyan-900/90",
    },
    icon: Star,
    baseScore: 50,
  },
  Uncommon: {
    name: "Uncommon",
    minPercentage: 25,
    maxPercentage: 50,
    colors: {
      gradient: "from-green-500 to-emerald-500",
      border: "border-green-400/50",
      text: "text-green-400",
      background: "from-green-900/90 to-emerald-900/90",
    },
    icon: Medal,
    baseScore: 25,
  },
  Common: {
    name: "Common",
    minPercentage: 50,
    maxPercentage: 100,
    colors: {
      gradient: "from-gray-500 to-slate-500",
      border: "border-gray-400/50",
      text: "text-gray-400",
      background: "from-gray-900/90 to-slate-900/90",
    },
    icon: Target,
    baseScore: 10,
  },
};

// Utility functions
export const getRankByScore = (score: number, completion: number): GameRank => {
  const ranks = Object.values(RANK_CONFIGS).sort(
    (a, b) => b.minScore - a.minScore
  );

  for (const rank of ranks) {
    if (score >= rank.minScore && completion >= rank.minCompletion) {
      return rank.name;
    }
  }

  return "Novice";
};

export const getTierByPercentage = (percentage: number): AchievementTier => {
  if (percentage >= 80) return "Common";
  if (percentage >= 50) return "Uncommon";
  if (percentage >= 25) return "Rare";
  if (percentage >= 10) return "Epic";
  if (percentage >= 3) return "Legendary";
  return "Mythic";
};

export const getRankConfig = (rank: GameRank): RankConfig => {
  return RANK_CONFIGS[rank];
};

export const getTierConfig = (tier: AchievementTier): TierConfig => {
  return TIER_CONFIGS[tier];
};

export const formatScore = (score: number): string => {
  if (isNaN(score) || score === 0) return "0";
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
  return score.toLocaleString();
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-green-500";
  if (percentage >= 75) return "bg-blue-500";
  if (percentage >= 50) return "bg-yellow-500";
  if (percentage >= 25) return "bg-orange-500";
  return "bg-red-500";
};
