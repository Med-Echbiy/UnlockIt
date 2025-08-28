import { motion } from "framer-motion";
import { GameStoreData } from "@/types/Game";
import { GameCard } from "./game-card-home";
import { Shuffle } from "lucide-react";

interface GameSectionProps {
  title: string;
  games: GameStoreData[];
  icon?: React.ElementType;
  priority?: "most-played" | "recently-played" | "recently-added" | "random";
  limit?: number;
  onPlay?: (game: GameStoreData) => void;
}

export function GameSection({
  title,
  games,
  icon: Icon = Shuffle,
  priority,
  limit = 4,
  onPlay,
}: GameSectionProps) {
  if (games.length === 0) return null;

  const displayedGames = games.slice(0, limit);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='space-y-4'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='p-2 rounded-lg bg-primary/10'>
          <Icon className='h-5 w-5 text-primary' />
        </div>
        <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
        <div className='h-0.5 bg-gradient-to-r from-primary/50 to-transparent flex-1 ml-4' />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {displayedGames.map((game, index) => (
          <motion.div
            key={game.appId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <GameCard game={game} priority={priority} onPlay={onPlay} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
