"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Gamepad2,
  Trophy,
  Star,
  Download,
  Database,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useUIStateStore from "@/store/ui-state-store";

interface GamingLoaderProps {
  onComplete?: () => void;
}

const loadingSteps = [
  { icon: Download, text: "Downloading game data", duration: 2000 },
  { icon: Database, text: "Loading achievements", duration: 1500 },
  { icon: Trophy, text: "Fetching metadata", duration: 1800 },
  { icon: Star, text: "Syncing progress", duration: 1200 },
  { icon: CheckCircle2, text: "Ready to play!", duration: 800 },
];

export function GamingLoader({ onComplete }: GamingLoaderProps) {
  const { isAddGameLoading, gameLoadingName, addGameLoadingProgress } =
    useUIStateStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const orbs = orbsRef.current;
    const controller = controllerRef.current;
    const progressBar = progressRef.current;

    if (!container || !orbs || !controller || !progressBar) return;
    gsap.set(container, { opacity: 0, scale: 0.8 });
    gsap.set(orbs.children, { opacity: 0, scale: 0 });
    gsap.set(controller, { rotation: -10, scale: 0.8 });
    const tl = gsap.timeline();

    tl.to(container, {
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: "back.out(1.7)",
    })
      .to(
        controller,
        {
          rotation: 0,
          scale: 1,
          duration: 0.8,
          ease: "elastic.out(1, 0.5)",
        },
        "-=0.3"
      )
      .to(
        orbs.children,
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.7)",
        },
        "-=0.4"
      );
    gsap.to(controller, {
      y: -8,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
    gsap.to(orbs.children, {
      rotation: 360,
      duration: 8,
      repeat: -1,
      ease: "none",
      stagger: 0.5,
    });
    gsap.to(controller, {
      filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.8))",
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (addGameLoadingProgress >= 100) {
      setIsComplete(true);
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    }
  }, [addGameLoadingProgress, onComplete]);

  // Disable scrolling when loader is active
  useEffect(() => {
    if (isAddGameLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAddGameLoading]);
  const stepIndex = Math.min(
    Math.floor((addGameLoadingProgress / 100) * loadingSteps.length),
    loadingSteps.length - 1
  );
  const CurrentIcon = loadingSteps[stepIndex]?.icon || Download;

  return (
    <>
      {isAddGameLoading ? (
        <div
          ref={containerRef}
          className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 h-screen'
        >
          <Card className='relative p-8 bg-gradient-to-br from-slate-900 via-blue-900/20 to-purple-900/20 border-blue-500/30 shadow-2xl max-w-md w-full mx-4'>
            {/* Animated background orbs */}
            <div
              ref={orbsRef}
              className='absolute inset-0 overflow-hidden rounded-lg'
            >
              <div className='absolute top-4 left-4 w-3 h-3 bg-blue-400 rounded-full opacity-60' />
              <div className='absolute top-12 right-8 w-2 h-2 bg-purple-400 rounded-full opacity-40' />
              <div className='absolute bottom-8 left-12 w-4 h-4 bg-cyan-400 rounded-full opacity-50' />
              <div className='absolute bottom-4 right-4 w-2 h-2 bg-pink-400 rounded-full opacity-60' />
              <div className='absolute top-1/2 left-1/3 w-1 h-1 bg-yellow-400 rounded-full opacity-70' />
            </div>

            <div className='relative z-10 text-center space-y-6'>
              {/* Main controller icon */}
              <div ref={controllerRef} className='flex justify-center'>
                <div className='relative'>
                  <Gamepad2 className='w-16 h-16 text-blue-400' />
                  <div className='absolute inset-0 bg-blue-400/20 rounded-full blur-xl' />
                </div>
              </div>
              {/* Game name */}
              <div className='space-y-2'>
                <h2 className='text-2xl font-bold text-white'>
                  Adding {gameLoadingName}
                </h2>
                <p className='text-blue-300 text-sm'>to your gaming library</p>
              </div>

              {/* Current step indicator */}
              <div className='flex items-center justify-center space-x-3 py-4'>
                <div className='relative'>
                  <CurrentIcon className='w-6 h-6 text-blue-400' />
                  <div className='absolute inset-0 bg-blue-400/30 rounded-full blur-md animate-pulse' />
                </div>
                <span className='text-white font-medium'>
                  {loadingSteps[stepIndex]?.text}
                </span>
              </div>

              {/* Progress bar */}
              <div ref={progressRef} className='space-y-2'>
                <Progress
                  value={addGameLoadingProgress}
                  className='h-2 bg-slate-800 border border-blue-500/30'
                />
                <div className='flex justify-between text-xs text-blue-300'>
                  <span>{Math.round(addGameLoadingProgress)}%</span>
                  <span>{isComplete ? "Complete!" : "Loading..."}</span>
                </div>
              </div>

              {/* Achievement-style completion */}
              {isComplete && (
                <div className='flex items-center justify-center space-x-2 text-green-400 animate-pulse'>
                  <Trophy className='w-5 h-5' />
                  <span className='font-semibold'>
                    Game Added Successfully!
                  </span>
                  <Zap className='w-5 h-5' />
                </div>
              )}
            </div>

            {/* Animated border glow */}
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 opacity-50 blur-sm animate-pulse' />
          </Card>
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
