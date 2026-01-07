import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Search,
  ExternalLink,
  Users,
  Gamepad2,
  Calendar,
  RotateCcw,
  X,
  Zap,
  Target,
  Trophy,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useHowLongToBeatWorkflow from "@/workflow/how-long-to-beat-workflow";
import { HowLongToBeatGame } from "@/types/howLongToBeat";
import { GameStoreData } from "@/types/Game";
import { formatPlayTime } from "@/lib/howLongToBeatHelper";

export function HowLongToBeatHeader({
  game,
  onOpenDialog,
}: {
  game: GameStoreData;
  onOpenDialog: () => void;
}) {
  const { getSessionData, clearStoredGameData } = useHowLongToBeatWorkflow();

  const [howLongToBeatData, setHowLongToBeatData] =
    useState<HowLongToBeatGame | null>(null);
  const [isLoading] = useState(false);
  const [isDialogOpen] = useState(false);
  const [, setSearchQuery] = useState(game.name);

  // Debug logging
  useEffect(() => {}, [isDialogOpen]);

  useEffect(() => {
    const existingData = getSessionData(String(game.appId));
    if (existingData) {
      setHowLongToBeatData(existingData);
    }
  }, [game.appId, getSessionData]);

  useEffect(() => {
    setSearchQuery(game.name);
  }, [game.name]);

  const handleClearData = async () => {
    await clearStoredGameData(String(game.appId));
    setHowLongToBeatData(null);
  };

  if (!howLongToBeatData) {
    return (
      <Card className='w-full border-border/50'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center'>
                <Clock className='w-8 h-8 text-white' />
              </div>
              <div>
                <CardTitle className='text-3xl font-black'>
                  HowLongToBeat
                </CardTitle>
                <CardDescription>
                  Get completion time estimates for this game
                </CardDescription>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onOpenDialog();
              }}
              className='px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-shadow'
            >
              {isLoading ? (
                <>
                  <motion.div
                    className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block'
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  Searching...
                </>
              ) : (
                <>
                  <Search className='w-4 h-4 mr-2 inline' />
                  Search HowLongToBeat
                </>
              )}
            </motion.button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className='w-full border-border/50'>
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className='flex items-center justify-between mb-6'
          >
            <div className='flex items-center gap-4'>
              <div className='w-16 h-16 rounded-2xl bg-black flex items-center justify-center'>
                <img src='/hltb_brand.webp' alt='HowLongToBeat Logo' />
              </div>
              <div>
                <CardTitle className='text-3xl font-black'>
                  HowLongToBeat
                </CardTitle>
                <CardDescription>
                  Completion times for {howLongToBeatData.game_name}
                </CardDescription>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  onOpenDialog();
                }}
              >
                <RotateCcw className='w-4 h-4 mr-2' />
                Update
              </Button>
              <Button variant='outline' size='sm' onClick={handleClearData}>
                <X className='w-4 h-4 mr-2' />
                Clear
              </Button>
              <Button variant='ghost' size='sm' asChild>
                <a
                  href={`https://howlongtobeat.com/game/${howLongToBeatData.game_id}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1'
                >
                  <ExternalLink className='w-4 h-4' />
                  HLTB
                </a>
              </Button>
            </div>
          </motion.div>

          <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
            {[
              {
                label: "Main Story",
                time: howLongToBeatData?.comp_main || 0,
                count: howLongToBeatData?.comp_main_count || 0,
                icon: Clock,
                gradient: "from-blue-500 to-blue-400",
              },
              {
                label: "Main + Extra",
                time: howLongToBeatData?.comp_plus || 0,
                count: howLongToBeatData?.comp_plus_count || 0,
                icon: Zap,
                gradient: "from-amber-500 to-orange-400",
              },
              {
                label: "Completionist",
                time: howLongToBeatData?.comp_100 || 0,
                count: howLongToBeatData?.comp_100_count || 0,
                icon: Target,
                gradient: "from-emerald-500 to-green-400",
              },
              {
                label: "All Styles",
                time: howLongToBeatData?.comp_all || 0,
                count: howLongToBeatData?.comp_all_count || 0,
                icon: Trophy,
                gradient: "from-purple-500 to-purple-400",
              },
            ].map((item, index) => {
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  className={`relative rounded-2xl p-6 bg-gradient-to-br  ${item.gradient} overflow-hidden shadow-lg`}
                >
                  <div className='relative z-10'>
                    <div className='text-sm font-bold text-white/80 mb-2'>
                      {item.label.toUpperCase()}
                    </div>
                    <div className='text-4xl font-black text-white mb-3'>
                      {formatPlayTime(item.time)}
                    </div>
                    {item.count > 0 && (
                      <div className='flex items-center gap-2 text-white/80'>
                        <Users className='w-5 h-5' />
                        <span className='text-sm font-semibold'>
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <motion.div
                    className='absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full'
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5,
                    }}
                  />
                </motion.div>
              );
            })}
          </div>

          {howLongToBeatData.profile_dev && (
            <div className='flex flex-wrap items-center gap-2 mt-4 pt-4 border-t'>
              <Badge variant='outline' className='text-xs'>
                {howLongToBeatData.game_type}
              </Badge>
              <span className='text-sm text-muted-foreground'>
                by {howLongToBeatData.profile_dev}
              </span>
              {howLongToBeatData.profile_platform && (
                <Badge variant='secondary' className='text-xs'>
                  <Gamepad2 className='w-3 h-3 mr-1' />
                  {howLongToBeatData.profile_platform}
                </Badge>
              )}
              {howLongToBeatData.release_world > 0 && (
                <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                  <Calendar className='w-3 h-3' />
                  <span>{howLongToBeatData.release_world}</span>
                </div>
              )}
              {howLongToBeatData.review_score > 0 && (
                <div className='flex items-center gap-1 text-sm'>
                  <Star className='w-3 h-3 fill-amber-400 text-amber-400' />
                  <span className='font-medium'>
                    {howLongToBeatData.review_score}/10
                  </span>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
    </>
  );
}
