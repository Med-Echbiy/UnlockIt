import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useMyGamesStore from "@/store/my-games-store";
import useRustTrackPlaytimeWorkflow from "@/workflow/rust-track-playtime-workflow";
import { invoke } from "@tauri-apps/api/core";
import { Clock, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const game = useMyGamesStore((state) => state.getGameById(id as string));
  const [coverImg, setCoverImage] = useState<string | null>(null);
  const [backgroundImg, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      console.log({ game });
      if (game) {
        setCoverImage(
          await invoke("load_image", {
            path: game.header_image,
          })
        );
        setBackgroundImage(
          await invoke("load_image", {
            path: game.background,
          })
        );
      }
    })();
  }, []);
  if (!game) {
    return <></>;
  }
  const { playtime, isRunning, startTracking, stopTracking } =
    useRustTrackPlaytimeWorkflow(String(game.appId), game.exePath);
  // Now you can use the id variable
  return (
    <main className='w-full min-h-screen'>
      <div className='grid grid-cols-1 p-3'>
        <Card className='flex flex-col  border-none'>
          <CardHeader>
            {coverImg && (
              <img
                src={coverImg}
                alt='cover'
                className='mx-auto object-cover object-center aspect-video max-w-[30%] mb-10 rounded-2xl'
              />
            )}
            <CardTitle className='text-center'>{game.name}</CardTitle>
            <div className='flex flex-wrap max-w-xs mx-auto justify-center gap-5 items-center mt-5'>
              {!isRunning ? (
                <Button
                  className='max-w-fit mx-auto'
                  onClick={() => startTracking()}
                >
                  <div className='flex items-center gap-2'>
                    <Play />
                    Play
                  </div>
                </Button>
              ) : (
                <Button
                  className='max-w-fit mx-auto'
                  variant='destructive'
                  onClick={() => stopTracking()}
                >
                  <div className='flex items-center gap-2'>
                    <Square />
                    Stop
                  </div>
                </Button>
              )}
              <p className='flex items-center gap-2'>
                <Clock />
                <span>
                  Time Played: {Math.floor(playtime / 60)}m {playtime % 60}s
                </span>
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

export default GameDetails;
