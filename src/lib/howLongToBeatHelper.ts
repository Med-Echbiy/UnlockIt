import { HowLongToBeatGame } from "@/types/howLongToBeat";

// Helper function to format time display
export const formatPlayTime = (seconds: number): string => {
  if (seconds === 0) return "No data";

  const hours = seconds / 60 / 60;

  if (hours < 1) {
    return `${seconds * 60}m`;
  } else {
    return `${Math.ceil(hours)}h`;
  }
};

// Helper function to get the best matching game from search results
export const getBestMatch = (
  games: HowLongToBeatGame[],
  searchTerm: string
): HowLongToBeatGame | null => {
  if (games.length === 0) return null;

  const lowerSearchTerm = searchTerm.toLowerCase();

  // First, try exact match
  const exactMatch = games.find(
    (game) => game.game_name.toLowerCase() === lowerSearchTerm
  );
  if (exactMatch) return exactMatch;

  // Then try partial match starting with search term
  const startsWithMatch = games.find((game) =>
    game.game_name.toLowerCase().startsWith(lowerSearchTerm)
  );
  if (startsWithMatch) return startsWithMatch;

  // Finally, try partial match containing search term
  const containsMatch = games.find((game) =>
    game.game_name.toLowerCase().includes(lowerSearchTerm)
  );
  if (containsMatch) return containsMatch;

  // Return first result if no good matches found
  return games[0];
};
