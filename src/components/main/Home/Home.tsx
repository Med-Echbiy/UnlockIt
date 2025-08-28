import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Play,
  Plus,
  Star,
  Gamepad2,
  CalendarPlus,
  Shuffle,
  Trophy,
} from "lucide-react";
import useMyGamesStore from "@/store/my-games-store";
import useProfileStore from "@/store/profile-store";
import useParsingWorkflow from "@/workflow/parser/parse-workflow";
import { SyncAchievementsLoading } from "../shared/sync-achievements-loading";
import { HomeStats } from "./home-stats";
import { GameSection } from "./game-section";
import { AnimatedBackground } from "./animated-background";
import { GameStoreData } from "@/types/Game";
import { Button } from "@/components/ui/button";
import useAddGameWorkflow from "@/workflow/add-game-workflow";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

function Home() {
  const { parseAchievements } = useParsingWorkflow({
    appid: 0,
    exePath: "",
  });
  const { games } = useMyGamesStore();
  const { loadProfile } = useProfileStore();
  const { getGamePath } = useAddGameWorkflow();
  const [loading, setLoading] = useState(true);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [shuffledDiscoverGames, setShuffledDiscoverGames] = useState<
    GameStoreData[]
  >([]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Parse achievements for all games
  useEffect(() => {
    (async () => {
      setLoading(true);
      for (const game of games) {
        console.log("Parsing achievements for game:", game.name);
        await parseAchievements(game.appId, game.exePath);
      }
      setLoading(false);
    })();
  }, [games]);

  // Update shuffled discover games when games change
  useEffect(() => {
    const unplayedGames = games.filter((game) => game.status === "not-played");
    if (unplayedGames.length > 0) {
      const shuffled = [...unplayedGames].sort(() => Math.random() - 0.5);
      setShuffledDiscoverGames(shuffled);
    } else {
      setShuffledDiscoverGames([]);
    }
  }, [games]);

  // Game categorization logic
  const getGameSections = (): Array<{
    title: string;
    games: GameStoreData[];
    icon: React.ElementType;
    priority: "most-played" | "recently-played" | "recently-added" | "random";
    key: string;
  }> => {
    const sections = [];

    // Currently Playing
    const currentlyPlaying = games.filter((game) => game.status === "playing");
    if (currentlyPlaying.length > 0) {
      sections.push({
        title: "Continue Playing",
        games: currentlyPlaying,
        icon: Play,
        priority: "recently-played" as const,
        key: "playing",
      });
    }

    // Recently Added (last 4 games by appId - assuming higher appId = more recent)
    const recentlyAdded = [...games]
      .sort((a, b) => b.appId - a.appId)
      .slice(0, 4);
    if (recentlyAdded.length > 0) {
      sections.push({
        title: "Recently Added",
        games: recentlyAdded,
        icon: CalendarPlus,
        priority: "recently-added" as const,
        key: "recent",
      });
    }

    // Completed Games
    const completedGames = games.filter(
      (game) => game.status === "completed" || game.status === "beaten"
    );
    if (completedGames.length > 0) {
      sections.push({
        title: "Completed Games",
        games: completedGames,
        icon: Trophy,
        priority: "random" as const,
        key: "completed",
      });
    }

    // High Rated Games (rating > 7)
    const highRatedGames = games.filter(
      (game) =>
        game.my_rating &&
        game.my_rating !== "N/A" &&
        Number(game.my_rating) >= 7
    );
    if (highRatedGames.length > 0) {
      sections.push({
        title: "Highly Rated",
        games: highRatedGames,
        icon: Star,
        priority: "random" as const,
        key: "rated",
      });
    }

    // Random Selection
    if (shuffledDiscoverGames.length > 0) {
      sections.push({
        title: "Discover",
        games: shuffledDiscoverGames,
        icon: Shuffle,
        priority: "random" as const,
        key: "discover",
      });
    }

    return sections;
  };

  const handlePlayGame = async (game: GameStoreData) => {
    try {
      await invoke("launch_game", { exePath: game.exePath });
      toast.success(`Launching ${game.name}...`, {
        style: {
          background: "rgb(21 128 61)",
        },
      });
    } catch (error) {
      console.error("Failed to launch game:", error);
      toast.error(`Failed to launch ${game.name}`, {
        description: String(error),
        style: {
          background: "rgb(185 28 28)",
        },
      });
    }
  };

  const handleAddGame = async () => {
    const success = await getGamePath();
    if (success) {
      toast.success("Game added successfully!", {
        style: {
          background: "rgb(21 128 61)",
        },
      });
    }
  };

  const gameSections = getGameSections();

  if (loading) {
    return (
      <div className='w-full h-screen'>
        <SyncAchievementsLoading isVisible={loading} />
      </div>
    );
  }
  return (
    <div className='min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative'>
      <AnimatedBackground />

      <div className='container mx-auto px-6 py-8 space-y-12 relative z-10'>
        {/* Welcome Stats Section */}
        <HomeStats games={games} />

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className='flex flex-wrap gap-4 justify-center'
        >
          <Button
            onClick={handleAddGame}
            size='lg'
            className='bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-200'
          >
            <Plus className='h-4 w-4 mr-2' />
            Add New Game
          </Button>

          {games.length > 0 && (
            <Button
              variant='outline'
              size='lg'
              onClick={() => {
                const randomGame =
                  games[Math.floor(Math.random() * games.length)];
                handlePlayGame(randomGame);
              }}
              className='border-border/50 hover:border-border transition-all duration-200'
            >
              <Shuffle className='h-4 w-4 mr-2' />
              Play Random Game
            </Button>
          )}
        </motion.div>

        {/* Game Sections */}
        <AnimatePresence mode='wait'>
          {games.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className='text-center py-16'
            >
              <div className='bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6'>
                <Gamepad2 className='h-12 w-12 text-primary' />
              </div>
              <h2 className='text-2xl font-bold mb-4'>No Games Yet</h2>
              <p className='text-muted-foreground mb-8 max-w-md mx-auto'>
                Start building your game library by adding your first game.
                Click the "Add New Game" button above to get started!
              </p>
            </motion.div>
          ) : (
            <div className='space-y-16'>
              {gameSections.map((section, index) => (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  onHoverStart={() => setHoveredSection(section.key)}
                  onHoverEnd={() => setHoveredSection(null)}
                  className={`transition-all duration-300 ${
                    hoveredSection && hoveredSection !== section.key
                      ? "opacity-60"
                      : "opacity-100"
                  }`}
                >
                  <GameSection
                    title={section.title}
                    games={section.games}
                    icon={section.icon}
                    priority={section.priority}
                    onPlay={handlePlayGame}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Home;
