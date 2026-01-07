import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useAchievementsStore from "@/store/achievements-store";
import useMyGamesStore from "@/store/my-games-store";
import useHowLongToBeatWorkflow from "@/workflow/how-long-to-beat-workflow";
import useParsingWorkflow from "@/workflow/parser/parse-workflow";
import { SystemScoreSection } from "./sections/SystemScoreSection";
import { GameDetailsHeader } from "./sections/GameDetailsHeader";
import { GameDetailsAchievements } from "./sections/GameDetailsAchievements";
import { HowLongToBeatHeader } from "./sections/HowLongToBeatHeader";

function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const game = useMyGamesStore((state) => state.getGameById(id as string));
  const { getTrackedAchievementsFiles } = useAchievementsStore();
  const achievementData = useAchievementsStore((s) =>
    s.getAchievementByName?.(game?.name || "", String(game?.appId || ""))
  );
  const { parseAchievements } = useParsingWorkflow({
    appid: game?.appId || 0,
    exePath: game?.exePath || "",
  });

  // Dialog state for HowLongToBeat search
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const { executeHowLongToBeatWorkflow } = useHowLongToBeatWorkflow();
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchHowLongToBeat = async (gameName: string) => {
    setIsLoading(true);
    setIsDialogOpen(false);
    try {
      await executeHowLongToBeatWorkflow(String(game?.appId), gameName);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // Re-parse achievements when entering game detail page
  useEffect(() => {
    if (game && !isParsing) {
      setIsParsing(true);

      // Re-parse achievements to ensure:
      // 1. Achievement files are tracked properly
      // 2. Unlocked state is current and displayed correctly
      // 3. File watcher is set up for real-time tracking
      parseAchievements(game.appId, game.exePath)
        .then(() => {
          console.log(
            `[GameDetails] Successfully re-parsed achievements for ${game.name}`
          );
        })
        .catch((error) => {
          console.error(
            `[GameDetails] Failed to re-parse achievements:`,
            error
          );
        })
        .finally(() => {
          setIsParsing(false);
        });
    }
  }, [game?.appId]); // Only trigger when game changes

  useEffect(() => {
    if (game) {
      // Log tracking information when entering game detail page
      console.log("=== Game Detail Page Loaded ===");
      console.log("Game Name:", game.name);
      console.log("App ID:", game.appId);

      // Get tracked file for this game
      const trackedFiles = getTrackedAchievementsFiles();
      const gameTrackedFile = trackedFiles.find(
        (file) => file.appid === game.appId
      );

      if (gameTrackedFile) {
        console.log("Tracked Achievement File Path:", gameTrackedFile.filePath);
      } else {
        console.log("No tracked achievement file found for this game");
      }

      // Log achievement schema
      if (achievementData) {
        console.log("Achievement Schema:", {
          gameId: achievementData.gameId,
          gameName: achievementData.game?.gameName,
          gameVersion: achievementData.game?.gameVersion,
          totalAchievements:
            achievementData.game?.availableGameStats?.achievements?.length || 0,
          achievements: achievementData.game?.availableGameStats?.achievements,
        });

        // Log unlocked achievements
        const unlockedAchievements =
          achievementData.game?.availableGameStats?.achievements?.filter(
            (ach) => ach.defaultvalue === 1
          );
        console.log("Unlocked Achievements:", unlockedAchievements);
        console.log("Total Unlocked:", unlockedAchievements?.length || 0);

        // Log unlocked achievement file paths (if stored in achievement data)
        unlockedAchievements?.forEach((ach) => {
          if (ach.icon) {
            console.log(
              `Achievement "${ach.displayName}" icon path:`,
              ach.icon
            );
          }
        });
      } else {
        console.log("No achievement data found for this game");
      }

      console.log("==============================");
    }
  }, [game?.name, game?.appId, achievementData, getTrackedAchievementsFiles]);

  if (!game) {
    return <></>;
  }
  return (
    <main className='w-full min-h-screen p-2 max-w-screen-2xl mx-auto'>
      {game && (
        <>
          <Card className='grid grid-cols-1 p-3 gap-5 bg-transparent border-none  shadow-none'>
            <GameDetailsHeader id={id!} />
            <Separator />
            <SystemScoreSection game={game} />
            <Separator />
            <HowLongToBeatHeader
              game={game}
              onOpenDialog={() => {
                setSearchQuery(game.name);
                setIsDialogOpen(true);
              }}
            />
            <Separator />
            <GameDetailsAchievements game={game} />
          </Card>
        </>
      )}

      {/* Simple modal overlay */}
      {isDialogOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4'
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className='text-lg font-semibold mb-4'>Search HowLongToBeat</h3>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Enter game name...'
              className='w-full mb-4'
              autoFocus
            />
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (searchQuery.trim()) {
                    handleFetchHowLongToBeat(searchQuery.trim());
                  }
                }}
                disabled={!searchQuery.trim() || isLoading}
                className='bg-blue-600 hover:bg-blue-700 flex-1'
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
export default GameDetails;
