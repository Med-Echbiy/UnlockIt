"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Gamepad2, Star, Award, Target, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface AchievementsLoadingProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const loadingMessages = [
  "Gathering your epic wins...",
  "Syncing your gaming glory...",
  "Collecting achievement data...",
  "Loading your victories...",
  "Synchronizing trophies...",
  "Preparing your stats...",
];

const floatingIcons = [Trophy, Star, Award, Target, Zap];

export function SyncAchievementsLoading({
  isVisible,
  onComplete,
}: AchievementsLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  useEffect(() => {
    if (isVisible) {
      setStartTime(Date.now());
    } else {
      setStartTime(null);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          const elapsed = startTime ? Date.now() - startTime : 2000;
          const minVisible = 2000;
          const remaining = Math.max(minVisible - elapsed, 0);

          setTimeout(() => onComplete?.(), remaining + 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isVisible, onComplete, startTime]);

  // Disable scrolling when loader is active
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background to-card'
        >
          {/* Floating Achievement Icons */}
          {floatingIcons.map((Icon, index) => (
            <motion.div
              key={index}
              className='absolute text-muted-foreground/20'
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: [0, 1, 0],
                rotate: 360,
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.5,
              }}
            >
              <Icon size={24} />
            </motion.div>
          ))}

          {/* Main Loading Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='flex flex-col items-center space-y-8 p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-2xl'
          >
            {/* Central Loading Animation */}
            <div className='relative'>
              {/* Spinning Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className='w-24 h-24 rounded-full border-4 border-muted border-t-primary'
              />

              {/* Gamepad Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className='absolute inset-0 flex items-center justify-center'
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <Gamepad2 className='w-10 h-10 text-primary' />
                </motion.div>
              </motion.div>
            </div>

            {/* Loading Message */}
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className='text-center'
            >
              <h2 className='text-2xl font-bold text-card-foreground mb-2'>
                {loadingMessages[messageIndex]}
              </h2>
              <p className='text-muted-foreground'>
                Syncing achievements data with games
              </p>
            </motion.div>

            {/* Progress Bar */}
            <div className='w-80 space-y-2'>
              <Progress value={progress} className='h-3 bg-muted' />
              <div className='flex justify-between text-sm text-muted-foreground'>
                <span>Progress</span>
                <motion.span
                  key={Math.floor(progress)}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className='font-medium text-primary'
                >
                  {Math.floor(progress)}%
                </motion.span>
              </div>
            </div>

            {/* Pulsing Dots */}
            <div className='flex space-x-2'>
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.2,
                  }}
                  className='w-2 h-2 rounded-full bg-primary'
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
