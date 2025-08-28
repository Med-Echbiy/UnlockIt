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
  name: string;
  defaultvalue?: number;
  displayName?: string;
  hidden?: number;
  description?: string;
  icon?: string;
  icongray?: string;
  achievedAt?: string;
}

export interface GameStat {
  name: string;
  defaultvalue?: number | string;
}
