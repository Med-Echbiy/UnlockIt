import { motion, useInView } from "framer-motion";
import {
  User,
  Trophy,
  Calendar,
  TrendingUp,
  Star,
  Gamepad2,
  Target,
  Award,
  Zap,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import useProfileStore from "@/store/profile-store";
import { GameStoreData } from "@/types/Game";
import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import UserProfileCard from "../shared/user-profile";

interface HomeStatsProps {
  games: GameStoreData[];
}

export function HomeStats({ games }: HomeStatsProps) {
  const { profile } = useProfileStore();
  const [profilePic, setProfilePic] = useState<string>("");
  const [animatedValues, setAnimatedValues] = useState({
    totalGames: 0,
    completedGames: 0,
    currentlyPlaying: 0,
    averageRating: 0,
  });
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    (async () => {
      if (profile.avatar) {
        setProfilePic(await invoke("load_image", { path: profile.avatar }));
      }
    })();
  }, [profile.avatar]);

  const completedGames = games.filter(
    (game) => game.status === "completed" || game.status === "beaten"
  ).length;

  const stats = {
    totalGames: games.length,
    completedGames,
    currentlyPlaying: games.filter((game) => game.status === "playing").length,
    averageRating:
      games.filter((game) => game.my_rating && game.my_rating !== "N/A")
        .length > 0
        ? Number(
            (
              games
                .filter(
                  (game) =>
                    game.my_rating &&
                    game.my_rating !== "N/A" &&
                    !isNaN(Number(game.my_rating))
                )
                .reduce((sum, game) => sum + Number(game.my_rating), 0) /
              games.filter(
                (game) =>
                  game.my_rating &&
                  game.my_rating !== "N/A" &&
                  !isNaN(Number(game.my_rating))
              ).length
            ).toFixed(1)
          )
        : 0,
    completionRate:
      games.length > 0 ? Math.round((completedGames / games.length) * 100) : 0,
  };

  // Animate values when component comes into view
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setAnimatedValues({
          totalGames: stats.totalGames,
          completedGames: stats.completedGames,
          currentlyPlaying: stats.currentlyPlaying,
          averageRating: stats.averageRating,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInView, stats]);

  const getAchievementLevel = (completedGames: number) => {
    if (completedGames >= 100)
      return {
        name: "Legend",
        icon: Crown,
        color: "text-yellow-500",
        bg: "bg-yellow-500/20",
      };
    if (completedGames >= 50)
      return {
        name: "Master",
        icon: Award,
        color: "text-purple-500",
        bg: "bg-purple-500/20",
      };
    if (completedGames >= 25)
      return {
        name: "Expert",
        icon: Star,
        color: "text-blue-500",
        bg: "bg-blue-500/20",
      };
    if (completedGames >= 10)
      return {
        name: "Hunter",
        icon: Target,
        color: "text-green-500",
        bg: "bg-green-500/20",
      };
    return {
      name: "Novice",
      icon: Gamepad2,
      color: "text-gray-500",
      bg: "bg-gray-500/20",
    };
  };

  const achievement = getAchievementLevel(stats.completedGames);

  const enhancedStatCards = [
    {
      icon: Trophy,
      label: "Total Games",
      value: stats.totalGames,
      animatedValue: animatedValues.totalGames,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/20 to-blue-600/10",
      description: "Games in collection",
      trend: "+2 this month",
      showProgress: false,
    },
    {
      icon: Calendar,
      label: "Completed",
      value: stats.completedGames,
      animatedValue: animatedValues.completedGames,
      color: "text-green-500",
      bg: "bg-green-500/10",
      gradient: "from-green-500/20 to-green-600/10",
      description: `${stats.completionRate}% completion rate`,
      trend: `${achievement.name} level`,
      showProgress: true,
      progressValue: stats.completionRate,
    },
    {
      icon: TrendingUp,
      label: "Playing",
      value: stats.currentlyPlaying,
      animatedValue: animatedValues.currentlyPlaying,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      gradient: "from-yellow-500/20 to-yellow-600/10",
      description: "Currently active",
      trend: "In progress",
      showProgress: false,
    },
    {
      icon: User,
      label: "Avg Rating",
      value: stats.averageRating === 0 ? "N/A" : stats.averageRating.toFixed(1),
      animatedValue: animatedValues.averageRating,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      gradient: "from-purple-500/20 to-purple-600/10",
      description: "Personal rating",
      trend:
        stats.averageRating >= 8
          ? "Excellent taste!"
          : stats.averageRating >= 6
          ? "Good choices"
          : "Mixed reviews",
      showProgress: stats.averageRating > 0,
      progressValue: stats.averageRating * 10,
    },
  ];

  return (
    <div ref={ref} className='space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6'>
      {/* Welcome Section with Achievement Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='relative'
      >
        <UserProfileCard compact={false} variant='detailed' />

        {/* Achievement Badge Overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className='absolute -top-2 -right-2 z-20'
        >
          <div
            className={`p-3 rounded-full ${achievement.bg} backdrop-blur-sm border border-white/20 shadow-lg`}
          >
            <achievement.icon className={`h-6 w-6 ${achievement.color}`} />
          </div>
          <Badge
            className={`absolute -bottom-2 -right-2 ${achievement.color
              .replace("text-", "bg-")
              .replace("500", "500/90")} text-white text-xs px-2 py-1`}
          >
            {achievement.name}
          </Badge>
        </motion.div>
      </motion.div>

      {/* Enhanced Stats Cards */}
      <div className='space-y-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className='text-lg font-semibold text-foreground mb-4 flex items-center gap-2'>
            <Zap className='h-5 w-5 text-yellow-500' />
            Gaming Statistics
          </h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='grid grid-cols-2 gap-4'
        >
          {enhancedStatCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
              animate={isInView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.4 + index * 0.1,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.05,
                y: -8,
                rotateX: 5,
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
              className='group'
            >
              <Card
                className={`relative h-full overflow-hidden bg-gradient-to-br ${stat.gradient} backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-500 transform-gpu`}
              >
                {/* Animated Background Pattern */}
                <div className='absolute inset-0 opacity-5'>
                  <div className='absolute top-0 -left-4 w-24 h-24 bg-gradient-to-r from-transparent via-white to-transparent transform rotate-12 translate-x-full group-hover:translate-x-[-100px] transition-transform duration-1000' />
                </div>

                <CardContent className='relative p-4 text-center'>
                  {/* Icon with Glow Effect */}
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className={`w-14 h-14 rounded-full ${stat.bg} flex items-center justify-center mx-auto mb-3 relative`}
                  >
                    <stat.icon
                      className={`h-7 w-7 ${stat.color} relative z-10`}
                    />
                    <div
                      className={`absolute inset-0 rounded-full ${stat.bg} blur-md opacity-60 group-hover:opacity-80 transition-opacity`}
                    />
                  </motion.div>

                  {/* Animated Value */}
                  <div className='space-y-2'>
                    <motion.p
                      className='text-3xl font-bold font-mono'
                      animate={
                        isInView
                          ? {
                              scale: [1, 1.1, 1],
                              color: [
                                "#ffffff",
                                stat.color.replace("text-", "#"),
                                "#ffffff",
                              ],
                            }
                          : {}
                      }
                      transition={{
                        duration: 2,
                        delay: 0.6 + index * 0.1,
                        repeat: 0,
                      }}
                    >
                      {typeof stat.animatedValue === "number" &&
                      stat.animatedValue > 0
                        ? Math.floor(stat.animatedValue)
                        : stat.value}
                    </motion.p>

                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      {stat.label}
                    </p>

                    {/* Progress Bar for Completion Rate */}
                    {stat.showProgress && stat.progressValue !== undefined && (
                      <div className='mt-2 space-y-1'>
                        <Progress
                          value={stat.progressValue}
                          className='h-2 bg-background/50'
                        />
                        <p className='text-xs text-muted-foreground'>
                          {stat.description}
                        </p>
                      </div>
                    )}

                    {/* Trend Indicator */}
                    <div className='flex items-center justify-center gap-1 mt-2'>
                      <div
                        className={`w-2 h-2 rounded-full ${stat.color.replace(
                          "text-",
                          "bg-"
                        )} animate-pulse`}
                      />
                      <p className='text-xs text-muted-foreground'>
                        {stat.trend}
                      </p>
                    </div>
                  </div>
                </CardContent>

                {/* Decorative Corner Accent */}
                <div
                  className={`absolute top-0 right-0 w-8 h-8 ${stat.color.replace(
                    "text-",
                    "bg-"
                  )} opacity-20 transform rotate-45 translate-x-4 -translate-y-4`}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className='mt-6'
        >
          <Card className='bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm border border-border/50'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between text-sm'>
                <div className='flex items-center gap-2'>
                  <Trophy className='h-4 w-4 text-yellow-500' />
                  <span className='text-muted-foreground'>
                    Collection Progress
                  </span>
                </div>
                <div className='flex items-center gap-4'>
                  <Badge variant='secondary' className='text-xs'>
                    {stats.completionRate}% Complete
                  </Badge>
                  <Badge variant='outline' className='text-xs'>
                    {stats.currentlyPlaying} Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
