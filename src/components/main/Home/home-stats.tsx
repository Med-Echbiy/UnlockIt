import { motion } from "framer-motion";
import { User, Trophy, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import useProfileStore from "@/store/profile-store";
import { GameStoreData } from "@/types/Game";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface HomeStatsProps {
  games: GameStoreData[];
}

export function HomeStats({ games }: HomeStatsProps) {
  const { profile } = useProfileStore();
  const [profilePic, setProfilePic] = useState<string>("");
  useEffect(() => {
    (async () => {
      setProfilePic(await invoke("load_image", { path: profile.avatar }));
    })();
  }, [profile.avatar]);
  const stats = {
    totalGames: games.length,
    completedGames: games.filter(
      (game) => game.status === "completed" || game.status === "beaten"
    ).length,
    currentlyPlaying: games.filter((game) => game.status === "playing").length,
    averageRating:
      games.filter((game) => game.my_rating && game.my_rating !== "N/A")
        .length > 0
        ? (
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
        : "N/A",
  };

  const statCards = [
    {
      icon: Trophy,
      label: "Total Games",
      value: stats.totalGames,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Calendar,
      label: "Completed",
      value: stats.completedGames,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: TrendingUp,
      label: "Playing",
      value: stats.currentlyPlaying,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      icon: User,
      label: "Avg Rating",
      value: stats.averageRating,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='text-center py-8'
      >
        <div className='flex items-center justify-center mb-4'>
          <div className='w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center overflow-hidden'>
            {profile.avatar ? (
              <img
                src={profilePic}
                alt='Profile'
                className='w-full h-full object-cover'
              />
            ) : (
              <User className='h-8 w-8 text-primary' />
            )}
          </div>
        </div>
        <h1 className='text-3xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent'>
          Welcome back, {profile.name}!
        </h1>
        <p className='text-muted-foreground mt-2'>
          Ready to continue your gaming journey?
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='grid grid-cols-2 lg:grid-cols-4 gap-4'
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className='bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-300'>
              <CardContent className='p-4 text-center'>
                <div
                  className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center mx-auto mb-3`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className='space-y-1'>
                  <p className='text-2xl font-bold'>{stat.value}</p>
                  <p className='text-xs text-muted-foreground'>{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
