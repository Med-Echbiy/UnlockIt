"use client";

import { motion } from "framer-motion";
import useMyGamesStore from "@/store/my-games-store";
import { GameCard } from "./game-card";
import { Gamepad2 } from "lucide-react";
function Games() {
  const { games } = useMyGamesStore();

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
    <main className='w-full h-screen relative overflow-hidden p-4'>
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
            <span className='text-slate-400 text-sm'>({games.length})</span>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-4 items-stretch'
        >
          {games.map((game, index) => (
            <div key={game.appId} className='h-full flex flex-col'>
              <GameCard game={game} index={index} />
            </div>
          ))}
        </motion.div>

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
