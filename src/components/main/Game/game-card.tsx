"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { GameStoreData } from "@/types/Game";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

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
      <Link to={`/game/${game.appId}`} className='block'>
        <Card className='relative overflow-hidden border-0 bg-transparent shadow-none rounded-2xl'>
          <div className='relative aspect-[14/9] overflow-hidden'>
            <img
              src={img || "/placeholder.svg"}
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
      </Link>
    </motion.div>
  );
}
