"use client";

import type {
  HowLongToBeatResponse,
  HowLongToBeatGame,
} from "@/types/howLongToBeat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Star,
  Calendar,
  Gamepad2,
  Trophy,
  Users,
  ExternalLink,
  CheckCircle2,
  Search,
  Zap,
  Target,
} from "lucide-react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { formatPlayTime } from "@/lib/howLongToBeatHelper";

const mainUrl = "https://howlongtobeat.com/games/";

interface AsyncHowLongToBeatDialogProps {
  data: HowLongToBeatResponse;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (game: HowLongToBeatGame) => void;
}

function AsyncHowLongToBeatDialog({
  data,
  isOpen,
  onClose,
  onSelect,
}: AsyncHowLongToBeatDialogProps) {
  const [selectedGame, setSelectedGame] = useState<HowLongToBeatGame | null>(
    null
  );

  if (!data || !data.length) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='max-w-2xl'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <DialogHeader className='text-center'>
              <div className='mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4'>
                <Search className='w-8 h-8 text-white' />
              </div>
              <DialogTitle className='text-xl'>No Games Found</DialogTitle>
              <DialogDescription className='text-base'>
                No HowLongToBeat data was found for this game. Try searching
                with a different name or check the spelling.
              </DialogDescription>
            </DialogHeader>
            <div className='flex justify-center mt-6'>
              <Button
                onClick={onClose}
                variant='outline'
                className='min-w-24 bg-transparent'
              >
                Close
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleGameSelect = (game: HowLongToBeatGame) => {
    setSelectedGame(game);
  };

  const handleConfirm = () => {
    if (selectedGame) {
      onSelect(selectedGame);
      onClose();
    }
  };

  const getCompletionData = (game: HowLongToBeatGame) => [
    {
      label: "Main Story",
      time: game.comp_main,
      count: game.comp_main_count,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Main + Extra",
      time: game.comp_plus,
      count: game.comp_plus_count,
      icon: Zap,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Completionist",
      time: game.comp_100,
      count: game.comp_100_count,
      icon: Target,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "All Styles",
      time: game.comp_all,
      count: game.comp_all_count,
      icon: Trophy,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-full overflow-hidden flex flex-col sm:max-w-3xl h-full max-h-[85vh] '>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className='pb-6'>
            <DialogTitle className='flex items-center gap-3 text-2xl'>
              <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                <Gamepad2 className='w-5 h-5 text-white' />
              </div>
              <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                Games Library Selection
              </span>
            </DialogTitle>
            <DialogDescription className='text-base text-muted-foreground'>
              Choose the correct game from the HowLongToBeat database to track
              completion times and add to your library.
            </DialogDescription>
          </DialogHeader>
        </motion.div>

        <ScrollArea className='flex-1 pr-4 overflow-auto'>
          <DialogDescription className='text-sm text-muted-foreground mb-2'>
            <Button variant='outline'>Total Results: {data.length} </Button>
          </DialogDescription>
          <div className='space-y-4'>
            <AnimatePresence>
              {data.map((game, index) => {
                const completionData = getCompletionData(game);
                const isSelected = selectedGame?.game_id === game.game_id;

                return (
                  <motion.div
                    key={game.game_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.3,
                      ease: "easeOut",
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                        isSelected
                          ? "border-primary bg-gradient-to-r from-primary/5 to-purple-500/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                      onClick={() => handleGameSelect(game)}
                    >
                      <CardHeader className='pb-4'>
                        <div className='flex items-start gap-4'>
                          <div className='relative flex-shrink-0'>
                            <div className='w-20 h-28 bg-gradient-to-br from-muted to-muted/50 rounded-lg overflow-hidden border'>
                              <img
                                src={
                                  mainUrl + game.game_image ||
                                  "/placeholder.svg"
                                }
                                alt={game.game_name}
                                className='w-full h-full object-cover transition-transform duration-300 hover:scale-105'
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    "/placeholder.svg?height=112&width=80&text=Game";
                                }}
                              />
                            </div>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className='absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center'
                              >
                                <CheckCircle2 className='w-4 h-4 text-primary-foreground' />
                              </motion.div>
                            )}
                          </div>

                          <div className='flex-1 min-w-0'>
                            <CardTitle className='text-xl line-clamp-2 mb-2 text-balance'>
                              {game.game_name}
                            </CardTitle>
                            <CardDescription>
                              <div className='flex flex-wrap items-center gap-3 text-sm'>
                                {game.profile_platform && (
                                  <Badge
                                    variant='secondary'
                                    className='text-xs font-medium'
                                  >
                                    <Gamepad2 className='w-3 h-3 mr-1' />
                                    {game.profile_platform}
                                  </Badge>
                                )}
                                {game.profile_dev && (
                                  <span className='text-muted-foreground font-medium'>
                                    by {game.profile_dev}
                                  </span>
                                )}
                                {game.release_world > 0 && (
                                  <div className='flex items-center gap-1 text-muted-foreground'>
                                    <Calendar className='w-3 h-3' />
                                    <span>{game.release_world}</span>
                                  </div>
                                )}
                                {game.review_score > 0 && (
                                  <div className='flex items-center gap-1'>
                                    <Star className='w-3 h-3 fill-amber-400 text-amber-400' />
                                    <span className='font-medium'>
                                      {game.review_score}/10
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className='pt-0'>
                        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4'>
                          {completionData.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                              <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: index * 0.05 + idx * 0.02,
                                }}
                                className={`${item.bgColor} rounded-lg p-3 text-center border`}
                              >
                                <div
                                  className={`flex items-center justify-center gap-1 text-xs font-medium mb-2 ${item.color}`}
                                >
                                  <Icon className='w-3 h-3' />
                                  {item.label}
                                </div>
                                <div className='text-lg font-bold text-foreground'>
                                  {formatPlayTime(item.time)}
                                </div>
                                {item.count > 0 && (
                                  <div className='flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1'>
                                    <Users className='w-3 h-3' />
                                    {item.count.toLocaleString()}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>

                        <Separator className='my-4' />

                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant='outline'
                              className='text-xs font-medium'
                            >
                              {game.game_type}
                            </Badge>
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            asChild
                            className='text-xs hover:text-primary'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={`https://howlongtobeat.com/game/${game.game_id}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center gap-1'
                            >
                              View on HLTB
                              <ExternalLink className='w-3 h-3' />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='flex items-center justify-between pt-6 border-t bg-background/80 backdrop-blur-sm'
        >
          <div className='flex items-center gap-2'>
            {selectedGame ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className='flex items-center gap-2 text-sm'
              >
                <CheckCircle2 className='w-4 h-4 text-primary' />
                <span className='font-medium'>Selected:</span>
                <span className='text-muted-foreground truncate max-w-48'>
                  {selectedGame.game_name}
                </span>
              </motion.div>
            ) : (
              <span className='text-sm text-muted-foreground'>
                Select a game to add to your library
              </span>
            )}
          </div>
          <div className='flex gap-3'>
            <Button variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedGame}
              className='min-w-28 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
            >
              {selectedGame ? "Add to Library" : "Select Game"}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
export async function openHowLongToBeatSelection(
  data: HowLongToBeatResponse
): Promise<HowLongToBeatGame | null> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const handleSelect = (game: HowLongToBeatGame) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(game);
    };

    const handleClose = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(null);
    };

    root.render(
      <AsyncHowLongToBeatDialog
        data={data}
        isOpen={true}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );
  });
}

export default AsyncHowLongToBeatDialog;
