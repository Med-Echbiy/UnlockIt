"use client";

import { useMemo } from "react";
import {
  getRankByScore,
  getTierByPercentage,
  getRankConfig,
  getTierConfig,
  type GameRank,
  type AchievementTier,
} from "@/lib/ranking-system";

export interface GameRankingData {
  rank: GameRank;
  config: ReturnType<typeof getRankConfig>;
  score: number;
  completion: number;
  nextRank?: {
    rank: GameRank;
    scoreNeeded: number;
    completionNeeded: number;
  };
}

export interface AchievementRankingData {
  tier: AchievementTier;
  config: ReturnType<typeof getTierConfig>;
  percentage: number;
}

export function useGameRanking(
  score: number,
  completion: number
): GameRankingData {
  return useMemo(() => {
    const rank = getRankByScore(score, completion);
    const config = getRankConfig(rank);

    // Calculate next rank requirements
    const ranks: GameRank[] = [
      "Novice",
      "Explorer",
      "Hunter",
      "Master",
      "Legend",
      "Grandmaster",
      "Touch Grass",
    ];

    const currentRankIndex = ranks.indexOf(rank);
    let nextRank: GameRankingData["nextRank"];

    if (currentRankIndex < ranks.length - 1) {
      const nextRankName = ranks[currentRankIndex + 1];
      const nextConfig = getRankConfig(nextRankName);

      nextRank = {
        rank: nextRankName,
        scoreNeeded: Math.max(0, nextConfig.minScore - score),
        completionNeeded: Math.max(0, nextConfig.minCompletion - completion),
      };
    }

    return {
      rank,
      config,
      score,
      completion,
      nextRank,
    };
  }, [score, completion]);
}

export function useAchievementRanking(
  percentage: number
): AchievementRankingData {
  return useMemo(() => {
    const tier = getTierByPercentage(percentage);
    const config = getTierConfig(tier);

    return {
      tier,
      config,
      percentage,
    };
  }, [percentage]);
}

// Hook for calculating game card tier based on achievements
export function useGameCardTier(
  unlocked: number,
  total: number
): {
  tier: GameRank;
  config: ReturnType<typeof getRankConfig>;
  percentage: number;
} {
  return useMemo(() => {
    if (total === 0) {
      return {
        tier: "Novice",
        config: getRankConfig("Novice"),
        percentage: 0,
      };
    }

    const percentage = (unlocked / total) * 100;
    let tier: GameRank;

    if (percentage === 100) tier = "Touch Grass";
    else if (percentage >= 90) tier = "Grandmaster";
    else if (percentage >= 75) tier = "Legend";
    else if (percentage >= 60) tier = "Master";
    else if (percentage >= 40) tier = "Hunter";
    else if (percentage >= 20) tier = "Explorer";
    else tier = "Novice";

    return {
      tier,
      config: getRankConfig(tier),
      percentage,
    };
  }, [unlocked, total]);
}
