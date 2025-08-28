import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameStoreData } from "@/types/Game";
import { Star, Calendar, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameActions } from "./game-actions";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GameCardProps {
  game: GameStoreData;
  onPlay?: (game: GameStoreData) => void;
  priority?: "most-played" | "recently-played" | "recently-added" | "random";
}

const getStatusColor = (status: GameStoreData["status"]) => {
  const colors = {
    "not-played": "bg-gray-500",
    playing: "bg-blue-500",
    played: "bg-green-500",
    completed: "bg-purple-500",
    beaten: "bg-yellow-500",
    trash: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
};

const getStatusText = (status: GameStoreData["status"]) => {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function GameCard({ game, onPlay, priority }: GameCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [img, setImg] = useState("");
  useEffect(() => {
    (async () => {
      setImg(
        await invoke("load_image", {
          path: game.header_image,
        })
      );
    })();
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className='group'
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card className='overflow-hidden bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-300 py-0'>
        <div className='relative'>
          <div className=' overflow-hidden'>
            <img
              src={img}
              alt={game.name}
              className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/logo.png"; // fallback image
              }}
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
          </div>

          {priority && (
            <Badge
              variant='secondary'
              className='absolute top-2 right-2 bg-primary/90 text-primary-foreground'
            >
              {priority === "most-played" && "🔥 Most Played"}
              {priority === "recently-played" && "🎮 Recently Played"}
              {priority === "recently-added" && "✨ New"}
              {priority === "random" && "🎲 Random"}
            </Badge>
          )}

          <Badge
            className={`absolute top-2 left-2 ${getStatusColor(
              game.status
            )} text-white border-0`}
          >
            {getStatusText(game.status)}
          </Badge>
        </div>

        <CardContent className='p-4 space-y-3'>
          <div>
            <h3 className='font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors'>
              {game.name}
            </h3>
            <div className='flex items-center gap-2 text-sm text-muted-foreground mt-1'>
              {game.developers.slice(0, 2).map((dev, index) => (
                <span key={index} className='line-clamp-1'>
                  {dev}
                  {index < Math.min(game.developers.length - 1, 1) && ", "}
                </span>
              ))}
            </div>
          </div>

          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <Calendar className='h-3 w-3' />
              <span>{game.release_date.date || "TBA"}</span>
            </div>
            {game.metacritic?.score > 0 && (
              <div className='flex items-center gap-1'>
                <Star className='h-3 w-3' />
                <span>{game.metacritic.score}</span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-2 pt-2'>
            <Button
              onClick={() => onPlay?.(game)}
              size='sm'
              className='flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-200'
            >
              <Play className='h-3 w-3 mr-1' />
              Play
            </Button>
            {game.my_rating && game.my_rating !== "N/A" && (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <Star className='h-3 w-3 fill-current text-yellow-500' />
                <span>{game.my_rating}</span>
              </div>
            )}
          </div>

          {/* Game Actions - show on hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 10 }}
            transition={{ duration: 0.2 }}
            className='pt-2'
          >
            {/* {showActions && <GameActions game={game} />} */}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
