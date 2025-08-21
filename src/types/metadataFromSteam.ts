export interface SteamAchievement {
  name: string;
  path: string;
}

export interface SteamAchievements {
  highlighted: SteamAchievement[];
  total: number;
}

export interface SteamCategory {
  description: string;
  id: number;
}

export interface SteamContentDescriptors {
  ids: number[];
  notes: string | null;
}

export interface SteamGenre {
  description: string;
  id: string;
}

export interface SteamMetacritic {
  score: number;
  url: string;
}

export interface SteamMovieFormat {
  "480": string;
  max: string;
}

export interface SteamMovie {
  highlight: boolean;
  id: number;
  mp4: SteamMovieFormat;
  name: string;
  thumbnail: string;
  webm: SteamMovieFormat;
}

export interface SteamPackageSub {
  can_get_free_license: string;
  is_free_license: boolean;
  option_description: string;
  option_text: string;
  packageid: number;
  percent_savings: number;
  percent_savings_text: string;
  price_in_cents_with_discount: number;
}

export interface SteamPackageGroup {
  description: string;
  display_type: number;
  is_recurring_subscription: string;
  name: string;
  save_text: string;
  selection_text: string;
  subs: SteamPackageSub[];
  title: string;
}

export interface SteamPlatform {
  linux: boolean;
  mac: boolean;
  windows: boolean;
}

export interface SteamPriceOverview {
  currency: string;
  discount_percent: number;
  final: number;
  final_formatted: string;
  initial: number;
  initial_formatted: string;
}

export interface SteamRating {
  descriptors?: string;
  interactive_elements?: string;
  rating: string;
  required_age: string;
  use_age_gate: string;
}

export interface SteamRatings {
  cero?: SteamRating;
  crl?: SteamRating;
  csrr?: SteamRating;
  dejus?: SteamRating;
  esrb?: SteamRating;
  fpb?: SteamRating;
  nzoflc?: SteamRating;
  pegi?: SteamRating;
  usk?: SteamRating;
}

export interface SteamReleaseDate {
  coming_soon: boolean;
  date: string;
}

export interface SteamScreenshot {
  id: number;
  path_full: string;
  path_thumbnail: string;
}

export interface SteamSupportInfo {
  email: string;
  url: string;
}

export interface SteamRequirements {
  minimum: string;
  recommended: string;
}

export interface SteamMetadata {
  about_the_game: string;
  achievements: SteamAchievements;
  background: string;
  background_raw: string;
  capsule_image: string;
  capsule_imagev5: string;
  categories: SteamCategory[];
  content_descriptors: SteamContentDescriptors;
  controller_support: string;
  detailed_description: string;
  developers: string[];
  dlc: number[];
  genres: SteamGenre[];
  header_image: string;
  is_free: boolean;
  legal_notice: string;
  linux_requirements: SteamRequirements;
  mac_requirements: SteamRequirements;
  metacritic: SteamMetacritic;
  movies: SteamMovie[];
  name: string;
  package_groups: SteamPackageGroup[];
  packages: number[];
  pc_requirements: SteamRequirements;
  platforms: SteamPlatform;
  price_overview: SteamPriceOverview;
  publishers: string[];
  ratings: SteamRatings;
  recommendations: { total: number };
  release_date: SteamReleaseDate;
  required_age: string;
  reviews: string;
  screenshots: SteamScreenshot[];
  short_description: string;
  steam_appid: number;
  support_info: SteamSupportInfo;
  supported_languages: string;
  type: string;
  website: string | null;
}

export interface SteamMetadataMinimal {
  about_the_game: string;
  name: string;
  metacritic: SteamMetacritic;
  genres: SteamGenre[];
  capsule_image: string;
  capsule_imagev5: string;
  header_image: string;
  background: string;
  background_raw: string;
  developers: string[];
  release_date: {
    coming_soon: boolean;
    date: string;
  };
  steam_appid: number;
  short_description: string;
  screenshots: SteamScreenshot[];
}
