// Types for Steam's GetSchemaForGame -> availableGameStats.achievements
// See: https://partner.steamgames.com/doc/webapi/ISteamUserStats

export interface SteamSchemaResponse {
  game: GameSchema;
  gameId: number;
}

export interface GameSchema {
  gameName?: string;
  gameVersion?: string;
  availableGameStats?: AvailableGameStats;
}

export interface AvailableGameStats {
  achievements?: Achievement[];
  stats?: GameStat[];
}

export interface Achievement {
  // Machine name of the achievement
  name: string;
  // Default value (usually 0)
  defaultvalue?: number;
  // Human readable title
  displayName?: string;
  // 0 = visible, 1 = hidden
  hidden?: number;
  // Optional longer description
  description?: string;
  // URL to the achievement icon
  icon?: string;
  // URL to the gray (locked) icon
  icongray?: string;
  achievedAt?: string;
}

export interface GameStat {
  name: string;
  defaultvalue?: number | string;
}
