import { GameStoreData } from "@/types/Game";
import { Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import useRemoveGameWorkflow from "@/workflow/remove-game-workflow";
import useMyGamesStore from "@/store/my-games-store";
import { toast } from "sonner";

interface GameActionsProps {
  game: GameStoreData;
}

export function GameActions({ game }: GameActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(game.my_rating);
  const { removeGameFromStore } = useRemoveGameWorkflow();
  const { setRating: updateGameRating } = useMyGamesStore();

  const handleRemoveGame = async () => {
    const success = await removeGameFromStore(String(game.appId));
    if (success) {
      setShowDeleteDialog(false);
    }
  };

  const handleUpdateRating = () => {
    updateGameRating(String(game.appId), rating);
    setShowRatingDialog(false);
    toast.success(`Rating updated for ${game.name}`, {
      style: {
        background: "rgb(21 128 61)",
      },
    });
  };

  return (
    <>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setShowRatingDialog(true)}
          className='flex items-center gap-1'
        >
          <Star className='h-3 w-3' />
          Rate
        </Button>

        <Button
          variant='outline'
          size='sm'
          onClick={() => setShowDeleteDialog(true)}
          className='flex items-center gap-1 text-red-500 hover:text-red-600'
        >
          <Trash2 className='h-3 w-3' />
          Remove
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Game</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            <p>
              Are you sure you want to remove <strong>{game.name}</strong> from
              your library?
            </p>
            <p className='text-sm text-muted-foreground mt-2'>
              This action cannot be undone. The game will be removed from your
              library but not deleted from your computer.
            </p>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleRemoveGame}>
              Remove Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {game.name}</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>
                Rating (1-10)
              </label>
              <input
                type='number'
                min='1'
                max='10'
                step='0.1'
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className='w-full px-3 py-2 border border-border rounded-md bg-background'
                placeholder='Enter rating'
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setShowRatingDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRating}>Save Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
