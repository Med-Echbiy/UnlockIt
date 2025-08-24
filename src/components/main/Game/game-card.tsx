"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { GameStoreData } from "@/types/Game";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Folder, Users } from "lucide-react";
import useAchievementsStore from "@/store/achievements-store";
import { Progress } from "@/components/ui/progress";

interface GameCardProps {
  game: GameStoreData;
  index: number;
}

export function GameCard({ game, index }: GameCardProps) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const src: string = await invoke("load_image", {
        path: game.header_image,
      });
      setImg(src);
    })();
  }, []);
  const rawAchievements = useAchievementsStore(
    (s) =>
      s.getAchievementByName?.(game?.name, String(game?.appId))?.game
        ?.availableGameStats?.achievements
  );
  const achievements = Array.isArray(rawAchievements) ? rawAchievements : [];
  const unlocked = achievements.filter((e) => e?.defaultvalue !== 0).length;
  const total = achievements.length;
  console.log({ unlocked, total });
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className='group h-full flex flex-col'
    >
      <Link to={`/game/${game.appId}`} className='block h-full'>
        <Card className='relative overflow-hidden bg-slate-900/90 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/70 transition-all duration-300 rounded-2xl pt-0 h-full flex flex-col'>
          {/* Game Image Header */}
          <CardHeader className='p-0 relative'>
            <div className='relative overflow-hidden rounded-t-2xl aspect-video'>
              <motion.img
                src={
                  img ||
                  "/placeholder.svg?height=200&width=350&query=gaming+screenshot"
                }
                alt={game.name}
                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                whileHover={{ scale: 1.05 }}
              />
              {/* Gradient overlay for better text readability */}
              <div className='absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent' />

              {/* Game title overlay */}
              <div className='absolute bottom-4 left-4 right-4'>
                <motion.h3
                  className='text-2xl font-bold text-white mb-1 drop-shadow-lg'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {game.name}
                </motion.h3>
              </div>
            </div>
          </CardHeader>

          {/* Game Details */}
          <CardContent className='p-4 space-y-3'>
            {/* Developer */}
            <div className='flex items-center gap-2 text-slate-300'>
              <Users className='w-4 h-4' />
              <span className='text-sm'>{game.developers}</span>
            </div>

            {/* Release Date */}
            <div className='flex items-center gap-2 text-slate-300'>
              <Calendar className='w-4 h-4' />
              <span className='text-sm'>{game.release_date.date}</span>
            </div>

            {/* Genre Tags */}
            <div className='flex flex-wrap gap-1.5'>
              {game.genres.map((genre) => (
                <motion.div
                  key={genre.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                >
                  <Badge
                    variant='secondary'
                    className='bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30 transition-colors text-xs px-2 py-1'
                  >
                    {genre.description}
                  </Badge>
                </motion.div>
              ))}
            </div>

            {/* Installation Path */}
            <div className='flex items-start gap-2 text-slate-400 pt-2 border-t border-slate-700/50'>
              <Folder className='w-4 h-4 mt-0.5 flex-shrink-0' />
              <span className='text-xs font-mono break-all leading-relaxed'>
                {game.exePath}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <div>
              <Progress value={unlocked} max={total} />
            </div>
          </CardFooter>
          {/* Hover effect overlay */}
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl'
            initial={false}
          />
        </Card>
      </Link>
    </motion.div>
  );
}
