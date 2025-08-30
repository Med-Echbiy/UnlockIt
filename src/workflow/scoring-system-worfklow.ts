import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import { Achievement } from "@/types/achievements";

interface ScoreBreakdown {
  baseScore: number;
  rarityBonus: number;
  streakBonus: number;
  speedBonus: number;
  completionBonus: number;
  difficultyMultiplier: number;
  totalScore: number;
}

interface GameScore {
  gameId: number;
  gameName: string;
  achievements: {
    achievement: Achievement;
    score: number;
    breakdown: ScoreBreakdown;
    tier: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
  }[];
  totalGameScore: number;
  completionPercentage: number;
  rank: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";
}

interface UserProfile {
  totalScore: number;
  gamesPlayed: number;
  averageCompletion: number;
  rareAchievements: number;
  perfectGames: number;
  overallRank:
    | "Novice"
    | "Explorer"
    | "Hunter"
    | "Master"
    | "Legend"
    | "Grandmaster"
    | "Touch Grass";
  badges: string[];
}

const useScoringSystemWorkflow = () => {
  const { getAchievements } = useAchievementsStore();
  const { getGames } = useMyGamesStore();

  const calculateAchievementTier = (
    percentage: number
  ): "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic" => {
    if (percentage >= 80) return "Common";
    if (percentage >= 50) return "Uncommon";
    if (percentage >= 25) return "Rare";
    if (percentage >= 10) return "Epic";
    if (percentage >= 3) return "Legendary";
    return "Mythic";
  };

  const calculateBaseScore = (percentage: number): number => {
    if (percentage >= 80) return 10;
    if (percentage >= 50) return 25;
    if (percentage >= 25) return 50;
    if (percentage >= 10) return 100;
    if (percentage >= 3) return 250;
    if (percentage >= 1) return 500;
    if (percentage >= 0.5) return 750;
    return 1000;
  };

  const calculateRarityBonus = (
    percentage: number,
    isHidden: boolean
  ): number => {
    let bonus = 0;

    if (percentage < 1) bonus += 200;
    else if (percentage < 3) bonus += 100;
    else if (percentage < 10) bonus += 50;

    if (isHidden) bonus += 50;

    return bonus;
  };

  const calculateStreakBonus = (consecutiveAchievements: number): number => {
    if (consecutiveAchievements >= 10) return 100;
    if (consecutiveAchievements >= 5) return 50;
    if (consecutiveAchievements >= 3) return 25;
    return 0;
  };

  const calculateSpeedBonus = (
    achievedAt: string,
    gameReleaseDate: string
  ): number => {
    if (!achievedAt || !gameReleaseDate) return 0;

    const achievedDate = new Date(parseInt(achievedAt) * 1000);
    const releaseDate = new Date(gameReleaseDate);
    const daysDifference = Math.abs(
      (achievedDate.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference <= 7) return 100;
    if (daysDifference <= 30) return 50;
    if (daysDifference <= 90) return 25;
    return 0;
  };

  const calculateCompletionBonus = (completionPercentage: number): number => {
    if (completionPercentage === 100) return 500;
    if (completionPercentage >= 90) return 200;
    if (completionPercentage >= 75) return 100;
    if (completionPercentage >= 50) return 50;
    return 0;
  };

  const getDifficultyMultiplier = (
    gameName: string,
    achievements?: Achievement[],
    gameMetadata?: any
  ): number => {
    let multiplier = 1.0;

    // Method 1: Achievement data analysis (most reliable)
    if (achievements && achievements.length > 0) {
      const avgPercentage =
        achievements.reduce(
          (sum, ach) => sum + parseFloat(ach.percent || "100"),
          0
        ) / achievements.length;

      const ultraRareCount = achievements.filter(
        (ach) => parseFloat(ach.percent || "100") < 5
      ).length;
      const rarePercentage = (ultraRareCount / achievements.length) * 100;

      // Lower average percentage = harder game
      if (avgPercentage < 15 || rarePercentage > 40) multiplier = 1.5;
      else if (avgPercentage < 25 || rarePercentage > 25) multiplier = 1.3;
      else if (avgPercentage < 40 || rarePercentage > 15) multiplier = 1.2;
    }

    // Method 2: Genre/tag analysis (if available)
    if (gameMetadata?.genres) {
      const genres = gameMetadata.genres.map((g: any) =>
        g.description.toLowerCase()
      );
      const hardGenres = [
        "souls-like",
        "roguelike",
        "bullet hell",
        "hardcore",
        "simulation",
      ];
      const mediumGenres = ["action", "rpg", "strategy", "platformer"];

      if (
        hardGenres.some((genre) =>
          genres.some((g: string) => g.includes(genre))
        )
      ) {
        multiplier = Math.max(multiplier, 1.4);
      } else if (
        mediumGenres.some((genre) =>
          genres.some((g: string) => g.includes(genre))
        )
      ) {
        multiplier = Math.max(multiplier, 1.1);
      }
    }

    // Method 3: Fallback to known difficult games
    const lowerGameName = gameName.toLowerCase();
    const knownHardGames = [
      "dark souls",
      "sekiro",
      "elden ring",
      "cuphead",
      "hollow knight",
      "celeste",
      "super meat boy",
      "binding of isaac",
      "spelunky",
      "dwarf fortress",
      "getting over it",
      "i wanna be",
    ];
    const knownMediumGames = [
      "witcher",
      "assassin",
      "call of duty",
      "battlefield",
    ];

    if (knownHardGames.some((game) => lowerGameName.includes(game))) {
      multiplier = Math.max(multiplier, 1.4);
    } else if (knownMediumGames.some((game) => lowerGameName.includes(game))) {
      multiplier = Math.max(multiplier, 1.1);
    }

    return multiplier;
  };

  const calculateAchievementScore = (
    achievement: Achievement,
    gameName: string,
    gameReleaseDate: string,
    consecutiveAchievements: number,
    allAchievements?: Achievement[],
    gameMetadata?: any
  ): { score: number; breakdown: ScoreBreakdown; tier: string } => {
    const percentage = parseFloat(achievement.percent || "100");
    const isHidden = achievement.hidden === 1;

    const baseScore = calculateBaseScore(percentage);
    const rarityBonus = calculateRarityBonus(percentage, isHidden);
    const streakBonus = calculateStreakBonus(consecutiveAchievements);
    const speedBonus = calculateSpeedBonus(
      achievement.achievedAt || "",
      gameReleaseDate
    );
    const completionBonus = 0; // Calculated at game level
    const difficultyMultiplier = getDifficultyMultiplier(
      gameName,
      allAchievements,
      gameMetadata
    );

    const subtotal =
      baseScore + rarityBonus + streakBonus + speedBonus + completionBonus;
    const totalScore = Math.round(subtotal * difficultyMultiplier);
    const tier = calculateAchievementTier(percentage);

    return {
      score: totalScore,
      breakdown: {
        baseScore,
        rarityBonus,
        streakBonus,
        speedBonus,
        completionBonus,
        difficultyMultiplier,
        totalScore,
      },
      tier,
    };
  };

  const calculateGameScore = (gameId: number): GameScore | null => {
    const game = getGames().find((g) => g.appId === gameId);
    const gameAchievements = getAchievements().find((a) => a.gameId === gameId);

    if (!game || !gameAchievements?.game?.availableGameStats?.achievements)
      return null;

    const achievementsList =
      gameAchievements.game.availableGameStats.achievements;
    const unlockedAchievements = achievementsList.filter(
      (a) => a.achievedAt && parseInt(a.achievedAt) > 0
    );

    const completionPercentage =
      (unlockedAchievements.length / achievementsList.length) * 100;

    let consecutiveCount = 0;
    const scoredAchievements = unlockedAchievements.map((achievement) => {
      if (achievement.achievedAt && parseInt(achievement.achievedAt) > 0) {
        consecutiveCount++;
      } else {
        consecutiveCount = 0;
      }

      const { score, breakdown, tier } = calculateAchievementScore(
        achievement,
        game.name,
        game.release_date.date,
        consecutiveCount,
        achievementsList,
        game // Pass game metadata for genre analysis
      );

      return {
        achievement,
        score,
        breakdown,
        tier: tier as any,
      };
    });

    const baseGameScore = scoredAchievements.reduce(
      (sum, a) => sum + a.score,
      0
    );
    const completionBonus = calculateCompletionBonus(completionPercentage);
    const totalGameScore = baseGameScore + completionBonus;

    const getGameRank = (score: number, completion: number): any => {
      if (completion === 100 && score >= 5000) return "Master";
      if (completion >= 90 && score >= 3000) return "Diamond";
      if (completion >= 75 && score >= 2000) return "Platinum";
      if (completion >= 50 && score >= 1000) return "Gold";
      if (completion >= 25 && score >= 500) return "Silver";
      return "Bronze";
    };

    return {
      gameId,
      gameName: game.name,
      achievements: scoredAchievements,
      totalGameScore,
      completionPercentage,
      rank: getGameRank(totalGameScore, completionPercentage),
    };
  };

  const calculateUserProfile = (): UserProfile => {
    const gameScores = getGames()
      .map((game) => calculateGameScore(game.appId))
      .filter(Boolean) as GameScore[];

    const totalScore = gameScores.reduce(
      (sum, game) => sum + game.totalGameScore,
      0
    );
    const averageCompletion =
      gameScores.reduce((sum, game) => sum + game.completionPercentage, 0) /
        gameScores.length || 0;
    const rareAchievements = gameScores.reduce(
      (sum, game) =>
        sum +
        game.achievements.filter((a) =>
          ["Epic", "Legendary", "Mythic"].includes(a.tier)
        ).length,
      0
    );
    const perfectGames = gameScores.filter(
      (game) => game.completionPercentage === 100
    ).length;

    const getOverallRank = (score: number, avgCompletion: number): any => {
      // "Touch Grass" - Ultimate achievement for those who've truly mastered everything
      if (score >= 200000 && avgCompletion >= 98) return "Touch Grass";
      if (score >= 50000 && avgCompletion >= 90) return "Grandmaster";
      if (score >= 25000 && avgCompletion >= 75) return "Legend";
      if (score >= 10000 && avgCompletion >= 60) return "Master";
      if (score >= 5000 && avgCompletion >= 40) return "Hunter";
      if (score >= 1000 && avgCompletion >= 20) return "Explorer";
      return "Novice";
    };

    const badges = [];
    if (rareAchievements >= 50) badges.push("🏆 Rare Hunter");
    if (perfectGames >= 10) badges.push("💯 Perfectionist");
    if (gameScores.length >= 100) badges.push("🎮 Game Collector");
    if (totalScore >= 100000) badges.push("⭐ Score Master");
    if (averageCompletion >= 95) badges.push("🎯 Completionist");

    // Special "Touch Grass" achievement badges
    if (totalScore >= 200000 && averageCompletion >= 98) {
      badges.push("🌱 Touch Grass Master");
      badges.push("👑 Ultimate Gamer");
      badges.push("🌍 Go Outside Reminder");
    }

    // Additional tier-specific badges
    if (totalScore >= 150000) badges.push("🚀 Score Legend");
    if (rareAchievements >= 100) badges.push("💎 Mythic Collector");
    if (perfectGames >= 25) badges.push("🎖️ Perfect Master");
    if (gameScores.length >= 200) badges.push("🏛️ Game Library God");

    return {
      totalScore,
      gamesPlayed: gameScores.length,
      averageCompletion,
      rareAchievements,
      perfectGames,
      overallRank: getOverallRank(totalScore, averageCompletion),
      badges,
    };
  };

  const getLeaderboardData = () => {
    return getGames()
      .map((game) => calculateGameScore(game.appId))
      .filter(Boolean) as GameScore[];
  };

  return {
    calculateAchievementScore,
    calculateGameScore,
    calculateUserProfile,
    getLeaderboardData,
    calculateAchievementTier,
    calculateBaseScore,
  };
};

export default useScoringSystemWorkflow;
