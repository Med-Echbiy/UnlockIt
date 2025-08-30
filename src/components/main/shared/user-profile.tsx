"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Award, User, Gamepad2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import gsap from "gsap";
import { toast } from "sonner";
import useProfileStore from "@/store/profile-store";
import useMyGamesStore from "@/store/my-games-store";
import useScoringSystemWorkflow from "@/workflow/scoring-system-worfklow";
import { TIER_CONFIGS } from "@/lib/ranking-system";
import { useGameRanking } from "@/hooks/use-ranking";
import { formatScore } from "@/lib/ranking-system";

interface UserProfileCardProps {
  showAnimations?: boolean;
  compact?: boolean;
  variant?: "default" | "detailed" | "minimal";
  onClick?: () => void;
}

interface AnimatedScore {
  current: number;
  target: number;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  showAnimations = true,
  compact = false,
  variant = "default",
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const { getProfile, loadProfile } = useProfileStore();
  const { calculateUserProfile, getLeaderboardData } =
    useScoringSystemWorkflow();
  const { getGames } = useMyGamesStore();
  const [profilePicture, setProfilePicture] = useState("");
  const [gameImages, setGameImages] = useState<Record<string, string>>({});
  const [animatedScore, setAnimatedScore] = useState<AnimatedScore>({
    current: 0,
    target: 0,
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [gameScores, setGameScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // Load profile data and avatar
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProfile();
        const profile = getProfile();

        // Load avatar if available
        if (profile.avatar) {
          try {
            const avatarData = await invoke("load_image", {
              path: profile.avatar,
            });
            setProfilePicture(avatarData as string);
          } catch (error) {
            console.warn("Failed to load avatar:", error);
            // Use fallback avatar or keep empty
          }
        }

        // Calculate user profile data
        const calculatedProfile = calculateUserProfile();

        // Get real game scores from your scoring system
        const realGameScores = getLeaderboardData();

        // Sort games by score (highest first)
        const sortedGameScores = [...realGameScores].sort(
          (a, b) => (b.totalGameScore || 0) - (a.totalGameScore || 0)
        );

        // Load images for top games
        const topGames = sortedGameScores.slice(0, 10);
        const imagePromises = topGames.map(async (game) => {
          const gameData = getGames().find((g) => g.name === game.gameName);
          if (gameData?.header_image || gameData?.capsule_image) {
            try {
              const imagePath = gameData.header_image || gameData.capsule_image;
              const imageData = await invoke("load_image", { path: imagePath });
              return { [game.gameName]: imageData as string };
            } catch (error) {
              console.warn(`Failed to load image for ${game.gameName}:`, error);
              return { [game.gameName]: "" };
            }
          }
          return { [game.gameName]: "" };
        });

        const loadedImages = await Promise.all(imagePromises);
        const imageMap = loadedImages.reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        );

        setUserProfile(calculatedProfile);
        setGameScores(sortedGameScores);
        setGameImages(imageMap);
        setAnimatedScore({ current: 0, target: calculatedProfile.totalScore });
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load profile data:", error);
        toast.error("Failed to load profile data", {
          style: { background: "rgb(185 28 28)" },
        });

        // Set fallback data to prevent crashes
        const fallbackProfile = {
          totalScore: 0,
          gamesPlayed: 0,
          averageCompletion: 0,
          rareAchievements: 0,
          perfectGames: 0,
          overallRank: "Novice" as const,
          badges: [],
        };

        setUserProfile(fallbackProfile);
        setAnimatedScore({ current: 0, target: 0 });
        setIsLoading(false);
      }
    };

    loadData();
  }, [getProfile().avatar, getGames().length]);

  // GSAP animations with better cleanup and error handling
  useEffect(() => {
    if (!showAnimations || !cardRef.current || !userProfile) return;

    const tl = gsap.timeline();

    // Card entrance animation
    tl.fromTo(
      cardRef.current,
      {
        y: 60,
        opacity: 0,
        scale: 0.9,
        rotationX: 15,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        rotationX: 0,
        duration: 0.6,
        ease: "power2.out",
        transformOrigin: "center bottom",
      }
    );

    // Stagger animation for child elements
    const childElements = [
      avatarRef.current,
      scoreRef.current?.parentElement,
      progressRef.current,
      statsRef.current,
      badgesRef.current,
    ].filter(Boolean);

    if (childElements.length > 0) {
      tl.fromTo(
        childElements,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.3"
      );
    }

    // Enhanced score counter animation
    if (scoreRef.current && animatedScore.target > 0) {
      const scoreAnimation = gsap.to(animatedScore, {
        current: animatedScore.target,
        duration: 2,
        ease: "power2.out",
        delay: 0.5,
        onUpdate: () => {
          if (scoreRef.current) {
            const currentScore = Math.floor(animatedScore.current);
            scoreRef.current.textContent = formatScore(currentScore);

            // Color transition during counting
            const progress = animatedScore.current / animatedScore.target;
            if (progress > 0.8) {
              scoreRef.current.style.color = "rgb(21 128 61)"; // Success green
            } else if (progress > 0.5) {
              scoreRef.current.style.color = "rgb(59 130 246)"; // Primary blue
            }
          }
        },
      });

      tl.add(scoreAnimation, "-=1.5");
    }

    // Enhanced progress bar animation
    if (progressRef.current && userProfile.averageCompletion > 0) {
      const progressBar = progressRef.current.querySelector("[data-progress]");
      if (progressBar) {
        const progressAnimation = gsap.fromTo(
          progressBar,
          { width: "0%", opacity: 0.7 },
          {
            width: `${userProfile.averageCompletion}%`,
            opacity: 1,
            duration: 1.5,
            ease: "power2.out",
          }
        );

        tl.add(progressAnimation, "-=1");

        // Add shimmer effect after progress completes
        gsap.to(progressBar, {
          backgroundPosition: "200% 0",
          duration: 2,
          repeat: -1,
          ease: "none",
          delay: 2.5,
        });
      }
    }

    return () => {
      tl.kill();
    };
  }, [showAnimations, userProfile, animatedScore.target]);

  // Hover effects with better performance
  useEffect(() => {
    if (!cardRef.current || !showAnimations) return;

    let hoverTl: gsap.core.Timeline | null = null;

    const handleMouseEnter = () => {
      setIsHovered(true);

      if (hoverTl) hoverTl.kill();
      hoverTl = gsap.timeline();

      hoverTl
        .to(cardRef.current, {
          y: -8,
          scale: 1.02,
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(59, 130, 246, 0.3)",
          duration: 0.3,
          ease: "power2.out",
        })
        .to(
          cardRef.current?.querySelectorAll(".icon-hover") || [],
          {
            scale: 1.1,
            rotation: 5,
            duration: 0.2,
            stagger: 0.05,
            ease: "power2.out",
          },
          0
        );
    };

    const handleMouseLeave = () => {
      setIsHovered(false);

      if (hoverTl) hoverTl.kill();
      hoverTl = gsap.timeline();

      hoverTl
        .to(cardRef.current, {
          y: 0,
          scale: 1,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          duration: 0.3,
          ease: "power2.out",
        })
        .to(
          cardRef.current?.querySelectorAll(".icon-hover") || [],
          {
            scale: 1,
            rotation: 0,
            duration: 0.2,
            stagger: 0.05,
            ease: "power2.out",
          },
          0
        );
    };

    const cardElement = cardRef.current;
    cardElement.addEventListener("mouseenter", handleMouseEnter);
    cardElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (hoverTl) hoverTl.kill();
      cardElement?.removeEventListener("mouseenter", handleMouseEnter);
      cardElement?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [showAnimations]);

  // Auto-rotation effect for game carousel
  useEffect(() => {
    if (gameScores.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentGameIndex((prevIndex) =>
        prevIndex === gameScores.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [gameScores.length]);

  const { config: rankConfig } = useGameRanking(
    userProfile?.totalScore || 0,
    userProfile?.averageCompletion || 0
  );

  if (isLoading) {
    return (
      <div className='relative w-full max-w-md mx-auto'>
        <Card className='relative bg-gradient-to-br from-gray-900/90 via-slate-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 overflow-hidden'>
          {/* Animated gradient background */}
          <div className='absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 animate-pulse' />

          {/* Geometric pattern overlay */}
          <div className='absolute inset-0 opacity-10'>
            <svg className='w-full h-full' viewBox='0 0 400 300'>
              <defs>
                <pattern
                  id='loading-grid'
                  width='40'
                  height='40'
                  patternUnits='userSpaceOnUse'
                >
                  <path
                    d='M 40 0 L 0 0 0 40'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1'
                  />
                </pattern>
              </defs>
              <rect width='100%' height='100%' fill='url(#loading-grid)' />
            </svg>
          </div>

          <CardContent className='relative z-10 p-6'>
            <div className='animate-pulse space-y-4'>
              <div className='flex items-center space-x-4'>
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full animate-pulse'></div>
                <div className='space-y-2 flex-1'>
                  <div className='h-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded w-3/4 animate-pulse'></div>
                  <div className='h-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-1/2 animate-pulse'></div>
                </div>
              </div>
              <div className='space-y-2'>
                <div className='h-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded animate-pulse'></div>
                <div className='h-2 bg-gradient-to-r from-blue-600/50 to-purple-600/50 rounded animate-pulse'></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded animate-pulse'></div>
                <div className='h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded animate-pulse'></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='relative w-full mx-auto'>
      <Card
        ref={cardRef}
        className={`relative cursor-pointer transition-all duration-500 overflow-hidden group ${
          compact ? "p-4" : ""
        } ${isHovered ? "shadow-2xl shadow-primary/20" : "shadow-xl"}`}
        onClick={onClick}
        style={{
          backdropFilter: "blur(20px)",
          background: `linear-gradient(135deg, ${rankConfig.colors.background})`,
          border: `1px solid ${rankConfig.colors.glow}`,
        }}
      >
        {/* Dynamic Background Effects */}
        <div className='absolute inset-0 opacity-40'>
          {/* Animated gradient mesh with rank colors */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              userProfile?.overallRank === "Touch Grass"
                ? "from-green-500/15 via-emerald-500/10 to-teal-500/15"
                : userProfile?.overallRank === "Grandmaster"
                ? "from-purple-500/15 via-pink-500/10 to-purple-500/15"
                : userProfile?.overallRank === "Legend"
                ? "from-cyan-500/15 via-blue-500/10 to-cyan-500/15"
                : userProfile?.overallRank === "Master"
                ? "from-yellow-500/15 via-amber-500/10 to-yellow-500/15"
                : userProfile?.overallRank === "Hunter"
                ? "from-slate-500/15 via-gray-500/10 to-slate-500/15"
                : userProfile?.overallRank === "Explorer"
                ? "from-amber-500/15 via-yellow-500/10 to-amber-500/15"
                : "from-gray-500/15 via-slate-500/10 to-gray-500/15"
            } animate-pulse`}
          />

          {/* Rank-specific circuit pattern */}
          <svg
            className='absolute inset-0 w-full h-full'
            viewBox='0 0 400 300'
            opacity='0.1'
          >
            <defs>
              <linearGradient
                id='circuitGrad'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'
              >
                <stop
                  offset='0%'
                  stopColor={
                    userProfile?.overallRank === "Touch Grass"
                      ? "#22c55e"
                      : userProfile?.overallRank === "Grandmaster"
                      ? "#9333ea"
                      : userProfile?.overallRank === "Legend"
                      ? "#06b6d4"
                      : userProfile?.overallRank === "Master"
                      ? "#eab308"
                      : userProfile?.overallRank === "Hunter"
                      ? "#94a3b8"
                      : userProfile?.overallRank === "Explorer"
                      ? "#f59e0b"
                      : "#6b7280"
                  }
                />
                <stop
                  offset='50%'
                  stopColor={
                    userProfile?.overallRank === "Touch Grass"
                      ? "#10b981"
                      : userProfile?.overallRank === "Grandmaster"
                      ? "#c084fc"
                      : userProfile?.overallRank === "Legend"
                      ? "#0891b2"
                      : userProfile?.overallRank === "Master"
                      ? "#d97706"
                      : userProfile?.overallRank === "Hunter"
                      ? "#64748b"
                      : userProfile?.overallRank === "Explorer"
                      ? "#d97706"
                      : "#4b5563"
                  }
                />
                <stop
                  offset='100%'
                  stopColor={
                    userProfile?.overallRank === "Touch Grass"
                      ? "#059669"
                      : userProfile?.overallRank === "Grandmaster"
                      ? "#a855f7"
                      : userProfile?.overallRank === "Legend"
                      ? "#0e7490"
                      : userProfile?.overallRank === "Master"
                      ? "#b45309"
                      : userProfile?.overallRank === "Hunter"
                      ? "#475569"
                      : userProfile?.overallRank === "Explorer"
                      ? "#b45309"
                      : "#374151"
                  }
                />
              </linearGradient>
            </defs>

            {/* Horizontal lines */}
            <motion.line
              x1='0'
              y1='50'
              x2='400'
              y2='50'
              stroke='url(#circuitGrad)'
              strokeWidth='2'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.line
              x1='0'
              y1='150'
              x2='400'
              y2='150'
              stroke='url(#circuitGrad)'
              strokeWidth='1'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 4,
                delay: 1,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.line
              x1='0'
              y1='250'
              x2='400'
              y2='250'
              stroke='url(#circuitGrad)'
              strokeWidth='1'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 5,
                delay: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />

            {/* Vertical connectors */}
            <motion.line
              x1='100'
              y1='50'
              x2='100'
              y2='150'
              stroke='url(#circuitGrad)'
              strokeWidth='1'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 2,
                delay: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <motion.line
              x1='300'
              y1='150'
              x2='300'
              y2='250'
              stroke='url(#circuitGrad)'
              strokeWidth='1'
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 3,
                delay: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />

            {/* Connection nodes */}
            <motion.circle
              cx='100'
              cy='50'
              r='4'
              fill='url(#circuitGrad)'
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx='100'
              cy='150'
              r='3'
              fill='url(#circuitGrad)'
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, delay: 1, repeat: Infinity }}
            />
            <motion.circle
              cx='300'
              cy='150'
              r='3'
              fill='url(#circuitGrad)'
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, delay: 0.5, repeat: Infinity }}
            />
            <motion.circle
              cx='300'
              cy='250'
              r='4'
              fill='url(#circuitGrad)'
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, delay: 2, repeat: Infinity }}
            />
          </svg>

          {/* Floating particles with rank colors */}
          <div className='absolute inset-0'>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 rounded-full bg-current opacity-60`}
                style={{
                  color: rankConfig.colors.glow,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Special "Touch Grass" particles */}
            {userProfile?.overallRank === "Touch Grass" && (
              <>
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`grass-${i}`}
                    className='absolute w-2 h-2 bg-green-400/40 rounded-full'
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -30, 0],
                      scale: [0, 1.5, 0],
                      opacity: [0, 0.8, 0],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      delay: i * 1.5,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Glass reflection effect */}
        <div className='absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-60' />

        {/* Border glow effect with rank colors */}
        <div
          className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{
            boxShadow: `inset 0 0 20px ${
              userProfile?.overallRank === "Touch Grass"
                ? "rgba(34, 197, 94, 0.3)"
                : userProfile?.overallRank === "Grandmaster"
                ? "rgba(147, 51, 234, 0.3)"
                : userProfile?.overallRank === "Legend"
                ? "rgba(6, 182, 212, 0.3)"
                : userProfile?.overallRank === "Master"
                ? "rgba(234, 179, 8, 0.3)"
                : userProfile?.overallRank === "Hunter"
                ? "rgba(148, 163, 184, 0.3)"
                : userProfile?.overallRank === "Explorer"
                ? "rgba(245, 158, 11, 0.3)"
                : "rgba(107, 114, 128, 0.3)"
            }, 0 0 20px ${
              userProfile?.overallRank === "Touch Grass"
                ? "rgba(34, 197, 94, 0.2)"
                : userProfile?.overallRank === "Grandmaster"
                ? "rgba(147, 51, 234, 0.2)"
                : userProfile?.overallRank === "Legend"
                ? "rgba(6, 182, 212, 0.2)"
                : userProfile?.overallRank === "Master"
                ? "rgba(234, 179, 8, 0.2)"
                : userProfile?.overallRank === "Hunter"
                ? "rgba(148, 163, 184, 0.2)"
                : userProfile?.overallRank === "Explorer"
                ? "rgba(245, 158, 11, 0.2)"
                : "rgba(107, 114, 128, 0.2)"
            }`,
          }}
        />
        <CardHeader className={`relative z-10 ${compact ? "pb-2" : "pb-4"}`}>
          <div className='flex items-center space-x-4'>
            <div
              ref={avatarRef}
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30 flex items-center justify-center overflow-hidden transition-all duration-500 relative group ${
                isHovered
                  ? "shadow-2xl shadow-blue-500/40 scale-110"
                  : "shadow-lg shadow-blue-500/20"
              }`}
              style={{
                boxShadow: isHovered
                  ? "0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 30px rgba(59, 130, 246, 0.2)"
                  : "0 0 15px rgba(59, 130, 246, 0.3), inset 0 0 15px rgba(59, 130, 246, 0.1)",
              }}
            >
              {/* Avatar border animation */}
              <div
                className='absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-60 animate-spin-slow'
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 30%, 0% 30%)",
                  animationDuration: "3s",
                }}
              />

              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt='Profile'
                  className='w-full h-full object-cover rounded-full relative z-10'
                  onError={() => setProfilePicture("")}
                />
              ) : (
                <User className='h-8 w-8 text-blue-400 relative z-10 transition-all duration-300 group-hover:scale-110' />
              )}

              {/* Avatar glow effect */}
              <div className='absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
            </div>

            <div className='flex-1 min-w-0 text-start'>
              <CardTitle className='text-xl font-bold bg-gradient-to-r from-blue-200 via-white to-cyan-200 bg-clip-text text-transparent truncate'>
                {getProfile().name || "Player"}
              </CardTitle>
              <div className='flex items-center space-x-2 mt-1'>
                <Badge
                  className='text-white transition-all duration-500 hover:scale-105 border-0 shadow-lg'
                  style={{
                    background: `linear-gradient(135deg, ${rankConfig.colors.background})`,
                    boxShadow: isHovered
                      ? "0 0 15px currentColor"
                      : "0 0 8px currentColor",
                  }}
                >
                  {userProfile?.overallRank}
                </Badge>
                <div className='flex items-center space-x-1 text-sm text-slate-300'>
                  <Trophy className='h-4 w-4 text-yellow-400 transition-all duration-300 hover:rotate-12' />
                  <motion.span
                    ref={scoreRef}
                    className='font-mono font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'
                    animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    0
                  </motion.span>
                  <span className='text-slate-400'>pts</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className='relative z-10 space-y-4'>
          {/* Progress Section with enhanced visuals */}
          <div className='space-y-3' ref={progressRef}>
            <div className='flex justify-between text-sm'>
              <span className='text-slate-300 font-medium'>
                Overall Completion
              </span>
              <motion.span
                className='font-mono font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'
                animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {userProfile?.averageCompletion?.toFixed(1) || "0.0"}%
              </motion.span>
            </div>

            {/* Enhanced Progress Bar */}
            <div className='relative overflow-hidden rounded-full bg-slate-800/50 border border-slate-700/50 h-3'>
              <div className='absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20' />
              <motion.div
                className='h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full relative overflow-hidden'
                initial={{ width: "0%" }}
                animate={{ width: `${userProfile?.averageCompletion || 0}%` }}
                transition={{ duration: 2, delay: 0.5 }}
              >
                {/* Shimmer effect */}
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer' />
              </motion.div>

              {/* Progress glow */}
              <div
                className='absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full blur-sm opacity-60'
                style={{ width: `${userProfile?.averageCompletion || 0}%` }}
              />
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className='grid grid-cols-2 gap-4 text-center' ref={statsRef}>
            <motion.div
              className='space-y-2 p-4 rounded-xl bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 transition-all duration-500 hover:scale-105 hover:border-blue-500/50 group'
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
            >
              <div className='flex items-center justify-center space-x-2'>
                <div className='p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-300'>
                  <Gamepad2 className='h-5 w-5 text-blue-400 group-hover:scale-110 transition-all duration-300' />
                </div>
                <motion.span
                  className='text-2xl font-bold font-mono bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent'
                  animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  {userProfile?.gamesPlayed || 0}
                </motion.span>
              </div>
              <p className='text-xs text-slate-400 uppercase tracking-wider font-medium'>
                Games Played
              </p>
              <div className='w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent' />
            </motion.div>

            <motion.div
              className='space-y-2 p-4 rounded-xl bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 transition-all duration-500 hover:scale-105 hover:border-yellow-500/50 group'
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
            >
              <div className='flex items-center justify-center space-x-2'>
                <div className='p-2 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all duration-300'>
                  <Award className='h-5 w-5 text-yellow-400 group-hover:scale-110 transition-all duration-300' />
                </div>
                <motion.span
                  className='text-2xl font-bold font-mono bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent'
                  animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {userProfile?.rareAchievements || 0}
                </motion.span>
              </div>
              <p className='text-xs text-slate-400 uppercase tracking-wider font-medium'>
                Rare Achievements
              </p>
              <div className='w-full h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent' />
            </motion.div>
          </div>

          {/* Badges Section */}
          {!compact && userProfile?.badges && userProfile.badges.length > 0 && (
            <div className='space-y-2' ref={badgesRef}>
              <h4 className='text-sm font-semibold text-foreground'>Badges</h4>
              <div className='flex flex-wrap gap-2'>
                {userProfile.badges.map((badge: string, index: number) => (
                  <Badge
                    key={index}
                    variant='secondary'
                    className='text-xs transition-all duration-300 hover:scale-110 hover:shadow-md hover:shadow-primary/30'
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Animated Top Games Carousel */}
          {!compact && gameScores.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h4 className='text-sm font-semibold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent flex items-center gap-2'>
                  <Trophy className='h-4 w-4 text-yellow-400' />
                  Top Games
                </h4>
                {variant === "detailed" && (
                  <Badge
                    variant='outline'
                    className='text-xs bg-slate-800/50 border-slate-600/50'
                  >
                    {gameScores.length} games
                  </Badge>
                )}
              </div>

              {/* Single Game Carousel */}
              <div className='h-[300px] relative'>
                <AnimatePresence mode='wait'>
                  {(() => {
                    const topGames = gameScores.slice(
                      0,
                      Math.min(8, gameScores.length)
                    );
                    const currentGame = topGames[currentGameIndex];
                    const gameData = getGames().find(
                      (g) => g.name === currentGame.gameName
                    );
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
                              alt={currentGame.gameName}
                              className='w-full h-full object-cover'
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
                                  TIER_CONFIGS[
                                    currentGame.rank as keyof typeof TIER_CONFIGS
                                  ];
                                if (tierConfig) {
                                  const IconComponent = tierConfig.icon;
                                  return (
                                    <IconComponent
                                      className={`w-4 h-4 ${tierConfig.colors.text}`}
                                    />
                                  );
                                }
                                return (
                                  <Trophy className='w-4 h-4 text-gray-400' />
                                );
                              })()}
                            </div>
                          </div>

                          {/* Game Info */}
                          <div className='flex-1 flex flex-col justify-center text-center'>
                            <h5 className='text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-4 leading-tight'>
                              {currentGame.gameName}
                            </h5>

                            <div className='space-y-3'>
                              {/* Score */}
                              <div className='flex items-center justify-center gap-3'>
                                <TrendingUp className='h-5 w-5 text-green-400' />
                                <span className='text-3xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                                  {formatScore(
                                    Math.round(currentGame.totalGameScore || 0)
                                  )}
                                </span>
                                <span className='text-lg text-slate-400'>
                                  pts
                                </span>
                              </div>

                              {/* Additional Info */}
                              {variant === "detailed" && (
                                <div className='text-sm text-slate-400 space-y-2'>
                                  <div>
                                    {currentGame.completionPercentage?.toFixed(
                                      1
                                    ) || 0}
                                    % completed
                                  </div>
                                  <div>
                                    {currentGame.achievements?.length || 0}{" "}
                                    achievements
                                  </div>
                                  <Badge
                                    variant='outline'
                                    className='text-sm border-slate-600/50 bg-slate-800/50'
                                  >
                                    {currentGame.rank} rank
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {variant === "detailed" &&
                            currentGame.completionPercentage > 0 && (
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

                        {/* Carousel Indicators */}
                        <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2'>
                          {topGames.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentGameIndex(index)}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentGameIndex
                                  ? "bg-blue-400 shadow-lg shadow-blue-400/50"
                                  : "bg-slate-600 hover:bg-slate-500"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Decorative Elements */}
                        <div className='absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl' />
                        <div className='absolute bottom-4 left-4 w-10 h-10 bg-gradient-to-tr from-cyan-500/20 to-green-500/20 rounded-full blur-lg' />
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>

              {/* Static View for Minimal Variant */}
              {variant !== "detailed" && variant !== "default" && (
                <div className='space-y-2 max-h-[200px] overflow-y-auto'>
                  {gameScores.slice(0, 5).map((game: any, index: number) => {
                    const gameImage = gameImages[game.gameName];

                    return (
                      <div
                        key={`${game.gameId}-${index}`}
                        className='flex items-center space-x-3 p-2 rounded-lg bg-slate-800/40 border border-slate-600/30 hover:border-blue-500/50 transition-all duration-300'
                      >
                        {/* Game Image */}
                        {gameImage && (
                          <div className='flex-shrink-0 w-8 h-8 rounded overflow-hidden border border-slate-600/50'>
                            <img
                              src={gameImage}
                              alt={game.gameName}
                              className='w-full h-full object-cover'
                            />
                          </div>
                        )}

                        {/* Rank */}
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Game Name */}
                        <div className='flex-1 min-w-0'>
                          <span className='text-sm text-slate-200 truncate block'>
                            {game.gameName}
                          </span>
                        </div>

                        {/* Score */}
                        <div className='flex-shrink-0 text-sm font-mono font-bold text-green-400'>
                          {formatScore(Math.round(game.totalGameScore || 0))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Action Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className='w-full mt-6 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 hover:from-blue-500 hover:via-purple-500 hover:to-cyan-500 border-0 text-white font-semibold text-sm uppercase tracking-wider transition-all duration-500 relative overflow-hidden group'
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Profile updated!", {
                  style: { background: "rgb(21 128 61)" },
                });
              }}
            >
              {/* Button shimmer effect */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-1000' />

              {/* Button content */}
              <div className='relative z-10 flex items-center justify-center gap-2'>
                <User className='h-4 w-4 transition-all duration-300 group-hover:rotate-12' />
                View Full Profile
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.div>
              </div>

              {/* Button glow */}
              <div className='absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 blur-md opacity-50 group-hover:opacity-70 transition-opacity duration-500' />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileCard;
