export interface HowLongToBeatGame {
  game_id: number;
  game_name: string;
  game_image: string;
  game_type: string;
  comp_main: number; // Main story completion time in minutes
  comp_plus: number; // Main + extras completion time in minutes
  comp_100: number; // Completionist time in minutes
  comp_all: number; // All play styles average in minutes
  comp_main_count: number; // Number of submissions for main story
  comp_plus_count: number; // Number of submissions for main + extras
  comp_100_count: number; // Number of submissions for completionist
  comp_all_count: number; // Number of submissions for all play styles
  profile_platform: string;
  profile_dev: string;
  review_score: number;
  release_world: number;
}

export interface HowLongToBeatResponse extends Array<HowLongToBeatGame> {}
