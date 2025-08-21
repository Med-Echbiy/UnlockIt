"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { GameStoreData } from "@/types/Game";

interface GameCardProps {
  game: GameStoreData;
  index: number;
}

export function GameCard({ game, index }: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
      }}
      whileHover={{ scale: 1.05 }}
      className='group p-2'
    >
      <Card className='relative overflow-hidden border-0 bg-transparent shadow-none rounded-2xl'>
        <div className='relative aspect-[14/9] overflow-hidden'>
          <img
            src={game.header_image || "/placeholder.svg"}
            alt={game.name}
            className='w-full h-full object-cover object-center'
          />

          <div className='absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4'>
            <h3 className='text-white font-medium text-center text-sm'>
              {game.name}
            </h3>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
