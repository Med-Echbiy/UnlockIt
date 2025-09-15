import { HowLongToBeatGame } from "@/types/howLongToBeat";
export const formatPlayTime = (seconds: number): string => {
  if (seconds === 0) return "No data";

  const hours = seconds / 60 / 60;
  const minutes = seconds / 60;

  if (hours < 1) {
    return `${Math.floor(minutes)}m`;
  } else {
    return `${Math.ceil(hours)}h`;
  }
};
export const getBestMatch = (
  games: HowLongToBeatGame[],
  searchTerm: string
): HowLongToBeatGame | null => {
  if (games.length === 0) return null;

  const lowerSearchTerm = searchTerm.toLowerCase();
  const exactMatch = games.find(
    (game) => game.game_name.toLowerCase() === lowerSearchTerm
  );
  if (exactMatch) return exactMatch;
  const startsWithMatch = games.find((game) =>
    game.game_name.toLowerCase().startsWith(lowerSearchTerm)
  );
  if (startsWithMatch) return startsWithMatch;
  const containsMatch = games.find((game) =>
    game.game_name.toLowerCase().includes(lowerSearchTerm)
  );
  if (containsMatch) return containsMatch;
  return games[0];
};
