"use client";

import { motion } from "framer-motion";
import useMyGamesStore from "@/store/my-games-store";
import { GameCard } from "./game-card";
import {
  Gamepad2,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Trophy,
  Star,
  Medal,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { GameStoreData } from "@/types/Game";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exists } from "@tauri-apps/plugin-fs";
const getRatingTier = (rating: string) => {
  if (rating === "N/A") return "na";
  const numRating = Number(rating);
  if (numRating <= 10) return "red";
  if (numRating <= 30) return "bronze";
  if (numRating <= 60) return "silver";
  if (numRating <= 90) return "gold";
  return "diamond";
};
function Games() {
  const { games } = useMyGamesStore();
  const [filters, setFilters] = useState({
    status: "all" as GameStoreData["status"] | "all",
    rating: "all" as
      | "all"
      | "na"
      | "red"
      | "bronze"
      | "silver"
      | "gold"
      | "diamond",
    metacritic: "all" as "all" | "high" | "medium" | "low" | "none",
    genre: "all" as string,
    installed: "installed-only" as "all" | "installed-only" | "not-installed",
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [installedGamesMap, setInstalledGamesMap] = useState<
    Map<number, boolean>
  >(new Map());

  // Check which games are installed
  useEffect(() => {
    const checkInstalledStatus = async () => {
      const statusMap = new Map<number, boolean>();
      for (const game of games) {
        if (game.exePath) {
          try {
            const isInstalled = await exists(game.exePath);
            statusMap.set(game.appId, isInstalled);
          } catch {
            statusMap.set(game.appId, false);
          }
        } else {
          statusMap.set(game.appId, false);
        }
      }
      setInstalledGamesMap(statusMap);
    };

    checkInstalledStatus();
  }, [games]);
  const allGenres = games.flatMap((game) => game.genres);
  const uniqueGenres = Array.from(
    new Set(allGenres.map((genre) => genre.description))
  ).sort();
  const filteredGames = games.filter((game) => {
    if (filters.status !== "all" && game.status !== filters.status) {
      return false;
    }
    if (filters.rating !== "all") {
      const gameTier = getRatingTier(game.my_rating);
      if (gameTier !== filters.rating) {
        return false;
      }
    }
    if (filters.metacritic !== "all") {
      const score = game.metacritic?.score || 0;
      switch (filters.metacritic) {
        case "high":
          if (score < 80) return false;
          break;
        case "medium":
          if (score < 60 || score >= 80) return false;
          break;
        case "low":
          if (score < 40 || score >= 60) return false;
          break;
        case "none":
          if (score > 0) return false;
          break;
      }
    }
    if (filters.genre !== "all") {
      const hasGenre = game.genres.some(
        (genre) => genre.description === filters.genre
      );
      if (!hasGenre) return false;
    }

    // Check installation status
    if (filters.installed !== "all") {
      const isInstalled = installedGamesMap.get(game.appId) ?? false;
      if (filters.installed === "installed-only" && !isInstalled) {
        return false;
      }
      if (filters.installed === "not-installed" && isInstalled) {
        return false;
      }
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      status: "all",
      rating: "all",
      metacritic: "all",
      genre: "all",
      installed: "installed-only",
    });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.rating !== "all" ||
    filters.metacritic !== "all" ||
    filters.genre !== "all" ||
    filters.installed !== "installed-only";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <main className='w-full min-h-screen relative overflow-hidden p-4 max-w-screen-2xl mx-auto'>
      <div className='max-w-full mx-auto relative z-10'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <Gamepad2 className='w-6 h-6 text-slate-300' />
            <h1 className='text-2xl font-semibold text-white'>My Games</h1>
            <span className='text-slate-400 text-sm'>
              ({filteredGames.length} of {games.length})
            </span>
          </div>
        </motion.div>

        {/* Filters Section */}
        <Card className='w-full mb-6 bg-slate-800/50 border-slate-700'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
                  <SlidersHorizontal className='w-5 h-5 text-white' />
                </div>
                <div>
                  <CardTitle className='text-xl text-white'>
                    Game Filters
                  </CardTitle>
                  <CardDescription className='text-slate-400'>
                    Filter your games by status, rating, score, and genre
                  </CardDescription>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='text-sm border-slate-600 text-slate-300'
                >
                  {filteredGames.length} of {games.length} games
                </Badge>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Filter className='w-4 h-4' />
                  {isExpanded ? "Hide" : "Show"} Filters
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>

          {isExpanded && (
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
                {/* Installation Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-300'>
                    Installation
                  </label>
                  <select
                    value={filters.installed}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        installed: e.target.value as any,
                      }))
                    }
                    className='w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200'
                  >
                    <option value='all'>All Games</option>
                    <option value='installed-only'>Installed Only</option>
                    <option value='not-installed'>Not Installed</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-300'>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className='w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200'
                  >
                    <option value='all'>All Statuses</option>
                    <option value='not-played'>Not Played</option>
                    <option value='playing'>Playing</option>
                    <option value='played'>Played</option>
                    <option value='completed'>Completed</option>
                    <option value='beaten'>Beaten</option>
                    <option value='trash'>Trash</option>
                  </select>
                </div>

                {/* My Rating Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-300'>
                    My Rating
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        rating: e.target.value as any,
                      }))
                    }
                    className='w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200'
                  >
                    <option value='all'>All Ratings</option>
                    <option value='na'>N/A</option>
                    <option value='red'>Poor (0-10)</option>
                    <option value='bronze'>Fair (11-30)</option>
                    <option value='silver'>Good (31-60)</option>
                    <option value='gold'>Great (61-90)</option>
                    <option value='diamond'>Masterpiece (91-100)</option>
                  </select>
                </div>

                {/* Metacritic Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-300'>
                    Metacritic Score
                  </label>
                  <select
                    value={filters.metacritic}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        metacritic: e.target.value as any,
                      }))
                    }
                    className='w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200'
                  >
                    <option value='all'>All Scores</option>
                    <option value='high'>High (80+)</option>
                    <option value='medium'>Medium (60-79)</option>
                    <option value='low'>Low (40-59)</option>
                    <option value='none'>No Score</option>
                  </select>
                </div>

                {/* Genre Filter */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-300'>
                    Genre
                  </label>
                  <select
                    value={filters.genre}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, genre: e.target.value }))
                    }
                    className='w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-200'
                  >
                    <option value='all'>All Genres</option>
                    {uniqueGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className='flex flex-wrap gap-2 pt-2 border-t border-slate-600'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, status: "playing" }))
                  }
                  className='flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Gamepad2 className='w-3 h-3' />
                  Currently Playing
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, status: "completed" }))
                  }
                  className='flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Trophy className='w-3 h-3' />
                  Completed
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, rating: "gold" }))
                  }
                  className='flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Star className='w-3 h-3' />
                  Highly Rated
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, metacritic: "high" }))
                  }
                  className='flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Medal className='w-3 h-3' />
                  High Metacritic
                </Button>
                {hasActiveFilters && (
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={resetFilters}
                    className='flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  >
                    <RotateCcw className='w-3 h-3' />
                    Clear All
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-4 items-stretch'
        >
          {filteredGames.map((game, index) => (
            <div key={game.appId} className='h-full flex flex-col'>
              <GameCard game={game} index={index} />
            </div>
          ))}
        </motion.div>

        {filteredGames.length === 0 && games.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className='text-center py-16'
          >
            <Filter className='w-16 h-16 text-slate-400 mx-auto mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>
              No games match your filters
            </h3>
            <p className='text-slate-400 mb-4'>
              Try adjusting your filters to see more games
            </p>
            <Button
              onClick={resetFilters}
              variant='outline'
              className='border-slate-600 text-slate-300 hover:bg-slate-700'
            >
              <RotateCcw className='w-4 h-4 mr-2' />
              Clear All Filters
            </Button>
          </motion.div>
        )}

        {games.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className='text-center py-16'
          >
            <Gamepad2 className='w-16 h-16 text-slate-400 mx-auto mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>
              No games found
            </h3>
            <p className='text-slate-400'>
              Add some games to your library to get started
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default Games;
