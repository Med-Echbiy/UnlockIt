import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save, X } from "lucide-react";
import { useState } from "react";
import { getRatingIcon, getRatingStyles, getRatingLabel } from "./utils";

export function GameRatingInput({
  currentRating,
  onRatingChange,
}: {
  currentRating: string;
  onRatingChange: (rating: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRating, setTempRating] = useState(currentRating);

  const RatingIcon = getRatingIcon(currentRating);
  const ratingStyles = getRatingStyles(currentRating);
  const ratingLabel = getRatingLabel(currentRating);

  const handleSave = () => {
    if (
      tempRating === "N/A" ||
      (Number(tempRating) >= 0 &&
        Number(tempRating) <= 100 &&
        !isNaN(Number(tempRating)))
    ) {
      onRatingChange(tempRating);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempRating(currentRating);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className='flex items-center gap-2'>
        <Input
          type='text'
          value={tempRating}
          onChange={(e) => setTempRating(e.target.value)}
          className='w-24 h-8 text-sm'
          placeholder='N/A or 0-100'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button size='sm' onClick={handleSave} className='h-8 px-2'>
          <Save className='w-3 h-3' />
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={handleCancel}
          className='h-8 px-2'
        >
          <X className='w-3 h-3' />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant='outline'
      onClick={() => setIsEditing(true)}
      className={`flex items-center gap-2 ${ratingStyles} transition-all duration-200 hover:scale-105`}
      title={`${ratingLabel} - Click to edit rating`}
    >
      <RatingIcon className='w-4 h-4' />
      <span className='hidden sm:inline font-medium'>{ratingLabel}:</span>
      <span className='font-bold'>
        {currentRating === "N/A" ? "N/A" : `${currentRating}/100`}
      </span>
      <Edit className='w-3 h-3 opacity-50' />
    </Button>
  );
}
