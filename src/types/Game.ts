export interface GameStoreData {
  name: string;
  appId: number;
  dir: string;
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
  metacritic: {
    score: number;
    url: string;
  };
  genres: {
    description: string;
    id: string;
  }[];
  about_the_game: string;
  exePath: string;
}
