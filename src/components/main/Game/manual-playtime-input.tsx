import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ManualPlaytimeInputProps {
  currentPlaytime: number;
  onPlaytimeChange: (seconds: number) => Promise<void>;
}

const ManualPlaytimeInput = ({
  currentPlaytime,
  onPlaytimeChange,
}: ManualPlaytimeInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState(Math.floor(currentPlaytime / 3600));
  const [minutes, setMinutes] = useState(
    Math.floor((currentPlaytime % 3600) / 60)
  );
  const [isLoading, setIsLoading] = useState(false);

  const formatDisplayTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    } else if (m > 0) {
      return `${m}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const totalSeconds = hours * 3600 + minutes * 60;
      await onPlaytimeChange(totalSeconds);
      setIsEditing(false);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setHours(Math.floor(currentPlaytime / 3600));
    setMinutes(Math.floor((currentPlaytime % 3600) / 60));
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Button
        variant='outline'
        size='sm'
        onClick={() => setIsEditing(true)}
        className='flex items-center gap-2 text-muted-foreground hover:text-foreground'
      >
        <Clock className='w-4 h-4' />
        <span>{formatDisplayTime(currentPlaytime)}</span>
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className='flex items-center gap-2'
      >
        <div className='flex items-center gap-1'>
          <Input
            type='number'
            min='0'
            max='9999'
            value={hours}
            onChange={(e) =>
              setHours(Math.max(0, parseInt(e.target.value) || 0))
            }
            className='w-16 h-8 text-sm text-center'
            placeholder='0'
          />
          <span className='text-xs text-muted-foreground'>h</span>
        </div>

        <div className='flex items-center gap-1'>
          <Input
            type='number'
            min='0'
            max='59'
            value={minutes}
            onChange={(e) =>
              setMinutes(
                Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
              )
            }
            className='w-16 h-8 text-sm text-center'
            placeholder='0'
          />
          <span className='text-xs text-muted-foreground'>m</span>
        </div>

        <div className='flex gap-1'>
          <Button
            size='sm'
            onClick={handleSave}
            disabled={isLoading}
            className='h-8 w-8 p-0'
          >
            <Check className='w-3 h-3' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={handleCancel}
            disabled={isLoading}
            className='h-8 w-8 p-0'
          >
            <X className='w-3 h-3' />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ManualPlaytimeInput;
