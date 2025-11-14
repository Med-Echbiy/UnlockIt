import { useState } from "react";
import { igdbClient, type IGDBGame } from "@/lib/igdb-client";

interface IGDBMetadataResult {
  game: IGDBGame | null;
  isLoading: boolean;
  error: string | null;
}

const useGetIGDBMetadataWorkflow = () => {
  const [results, setResults] = useState<Map<string, IGDBMetadataResult>>(
    new Map()
  );

  /**
   * Search for a single game by name
   */
  const searchGame = async (gameName: string): Promise<IGDBGame | null> => {
    // Set loading state
    setResults((prev) =>
      new Map(prev).set(gameName, {
        game: null,
        isLoading: true,
        error: null,
      })
    );

    try {
      // Try exact match first
      let game = await igdbClient.getGameByName(gameName);

      // If no exact match, try search
      if (!game) {
        const searchResults = await igdbClient.searchGames(gameName, 1);
        game = searchResults.length > 0 ? searchResults[0] : null;
      }

      // Update result
      setResults((prev) =>
        new Map(prev).set(gameName, {
          game,
          isLoading: false,
          error: game ? null : "Game not found",
        })
      );

      return game;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch game data";

      setResults((prev) =>
        new Map(prev).set(gameName, {
          game: null,
          isLoading: false,
          error: errorMessage,
        })
      );

      console.error(`IGDB search error for "${gameName}":`, error);
      return null;
    }
  };

  /**
   * Search for multiple games
   */
  const searchMultipleGames = async (
    gameNames: string[]
  ): Promise<Map<string, IGDBGame | null>> => {
    // Set all to loading
    setResults((prev) => {
      const newResults = new Map(prev);
      gameNames.forEach((name) => {
        newResults.set(name, {
          game: null,
          isLoading: true,
          error: null,
        });
      });
      return newResults;
    });

    try {
      const results = await igdbClient.batchSearchGames(gameNames);

      // Update all results
      setResults((prev) => {
        const newResults = new Map(prev);
        results.forEach((game, name) => {
          newResults.set(name, {
            game,
            isLoading: false,
            error: game ? null : "Game not found",
          });
        });
        return newResults;
      });

      return results;
    } catch (error) {
      console.error("Batch IGDB search error:", error);

      // Update all to error state
      setResults((prev) => {
        const newResults = new Map(prev);
        gameNames.forEach((name) => {
          newResults.set(name, {
            game: null,
            isLoading: false,
            error: "Failed to fetch game data",
          });
        });
        return newResults;
      });

      return new Map();
    }
  };

  /**
   * Get game by IGDB ID
   */
  const getGameById = async (gameId: number): Promise<IGDBGame | null> => {
    const cacheKey = `id:${gameId}`;

    setResults((prev) =>
      new Map(prev).set(cacheKey, {
        game: null,
        isLoading: true,
        error: null,
      })
    );

    try {
      const game = await igdbClient.getGameById(gameId);

      setResults((prev) =>
        new Map(prev).set(cacheKey, {
          game,
          isLoading: false,
          error: game ? null : "Game not found",
        })
      );

      return game;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch game data";

      setResults((prev) =>
        new Map(prev).set(cacheKey, {
          game: null,
          isLoading: false,
          error: errorMessage,
        })
      );

      console.error(`IGDB fetch error for ID ${gameId}:`, error);
      return null;
    }
  };

  /**
   * Clear cached results
   */
  const clearResults = () => {
    setResults(new Map());
  };

  /**
   * Get cached result for a game
   */
  const getCachedResult = (
    gameName: string
  ): IGDBMetadataResult | undefined => {
    return results.get(gameName);
  };

  return {
    searchGame,
    searchMultipleGames,
    getGameById,
    clearResults,
    getCachedResult,
    results,
  };
};

export default useGetIGDBMetadataWorkflow;
