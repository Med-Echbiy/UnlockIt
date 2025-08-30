import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";
import { TIER_CONFIGS } from "@/lib/ranking-system";
import { formatScore } from "@/lib/ranking-system";
import { GameScore } from "@/types/scoring";
import { GameStoreData } from "@/types/Game";

interface GameCarouselProps {
  gameScores: GameScore[];
  currentGameIndex: number;
  gameImages: Record<string, string>;
  getGames: () => GameStoreData[];
  variant?: "default" | "detailed" | "minimal";
}

const GameCarousel: React.FC<GameCarouselProps> = ({
  gameScores,
  currentGameIndex,
  gameImages,
  getGames,
  variant = "default",
}) => {
  // Safety check for gameScores
  if (!gameScores || gameScores.length === 0) {
    console.log(
      "⚠️ [GameCarousel] No games to display - gameScores:",
      gameScores
    );
    return (
      <div className='flex items-center justify-center h-[300px] text-slate-400'>
        <div className='text-center'>
          <Trophy className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <p>No games to display</p>
        </div>
      </div>
    );
  }

  const topGames = gameScores.slice(0, Math.min(8, gameScores.length));
  const currentGame = topGames[currentGameIndex];

  console.log("🎮 [GameCarousel] Rendering:", {
    totalGameScores: gameScores.length,
    topGamesCount: topGames.length,
    currentGameIndex,
    currentGameExists: !!currentGame,
    currentGameName: currentGame?.gameName,
  });

  // Safety check for currentGame
  if (!currentGame) {
    console.log(
      "⚠️ [GameCarousel] No current game found - currentGameIndex:",
      currentGameIndex,
      "topGames length:",
      topGames.length
    );
    return (
      <div className='flex items-center justify-center h-[300px] text-slate-400'>
        <div className='text-center'>
          <Trophy className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <p>Loading game data...</p>
        </div>
      </div>
    );
  }

  const gameData = getGames().find((g) => g && g.name === currentGame.gameName);
  const gameImage =
    gameImages[currentGame.gameName] ||
    gameData?.header_image ||
    gameData?.capsule_image;

  return (
    <motion.div
      key={`${currentGame.gameId}-${currentGameIndex}`}
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -300, scale: 0.9 }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      className='absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/30 group'
    >
      {/* Game Background Image */}
      {gameImage && (
        <div className='absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500'>
          <img
            src={gameImage}
            alt={currentGame.gameName || "Game"}
            className='w-full h-full object-cover'
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className='absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-800/80 to-slate-700/60' />
        </div>
      )}

      <div className='relative z-10 p-6 h-full flex flex-col justify-between'>
        {/* Header with Rank */}
        <div className='flex items-start justify-between mb-4'>
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
              currentGameIndex === 0
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-yellow-500/50"
                : currentGameIndex === 1
                ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 shadow-gray-400/50"
                : currentGameIndex === 2
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-amber-600/50"
                : "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-blue-500/50"
            }`}
          >
            #{currentGameIndex + 1}
          </div>

          <div className='flex items-center justify-center'>
            {(() => {
              const tierConfig =
                TIER_CONFIGS[currentGame.rank as keyof typeof TIER_CONFIGS];
              if (tierConfig) {
                const IconComponent = tierConfig.icon;
                return (
                  <IconComponent
                    className={`w-4 h-4 ${tierConfig.colors.text}`}
                  />
                );
              }
              return <Trophy className='w-4 h-4 text-gray-400' />;
            })()}
          </div>
        </div>

        {/* Game Info */}
        <div className='flex-1 flex flex-col justify-center text-center'>
          <h5 className='text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-4 leading-tight'>
            {currentGame.gameName || "Unknown Game"}
          </h5>

          <div className='space-y-3'>
            {/* Score */}
            <div className='flex items-center justify-center gap-3'>
              <TrendingUp className='h-5 w-5 text-green-400' />
              <span className='text-3xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                {formatScore(Math.round(currentGame.totalGameScore || 0))}
              </span>
              <span className='text-lg text-slate-400'>pts</span>
            </div>

            {/* Additional Info */}
            {variant === "detailed" && (
              <div className='text-sm text-slate-400 space-y-2'>
                <div>
                  {currentGame.completionPercentage?.toFixed(1) || 0}% completed
                </div>
                <div>{currentGame.achievements?.length || 0} achievements</div>
                <Badge
                  variant='outline'
                  className='text-sm border-slate-600/50 bg-slate-800/50'
                >
                  {currentGame.rank || "Unranked"} rank
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {variant === "detailed" &&
          (currentGame.completionPercentage || 0) > 0 && (
            <div className='mt-4 w-full h-3 bg-slate-700/50 rounded-full overflow-hidden'>
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${currentGame.completionPercentage}%`,
                }}
                transition={{ duration: 1, delay: 0.3 }}
                className='h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full'
              />
            </div>
          )}
      </div>

      {/* Decorative Elements */}
      <div className='absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl' />
      <div className='absolute bottom-4 left-4 w-10 h-10 bg-gradient-to-tr from-cyan-500/20 to-green-500/20 rounded-full blur-lg' />
    </motion.div>
  );
};

export default GameCarousel;
