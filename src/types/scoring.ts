export interface ScoreBreakdown {
  baseScore: number;
  rarityBonus: number;
  streakBonus: number;
  speedBonus: number;
  completionBonus: number;
  difficultyMultiplier: number;
  totalScore: number;
}

export interface GameScore {
  gameId: number;
  gameName: string;
  achievements: {
    achievement: {
      name: string;
      defaultvalue?: number;
      displayName?: string;
      hidden?: number;
      description?: string;
      icon?: string;
      icongray?: string;
      achievedAt?: string;
      percent?: string;
    };
    score: number;
    breakdown: ScoreBreakdown;
    tier: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
  }[];
  totalGameScore: number;
  completionPercentage: number;
  rank: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";
}

export interface UserProfile {
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
