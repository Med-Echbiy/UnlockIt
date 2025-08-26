import useMyGamesStore from "@/store/my-games-store";
import useParsingWorkflow from "@/workflow/parser/parse-workflow";
import { use, useEffect, useState } from "react";
import { SyncAchievementsLoading } from "../shared/sync-achievements-loading";

function Home() {
  const { parseAchievements } = useParsingWorkflow({
    appid: 0,
    exePath: "",
  });
  const { games } = useMyGamesStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      for (const game of games) {
        console.log("Parsing achievements for game:", game.name);
        await parseAchievements(game.appId, game.exePath);
      }
      setLoading(false);
    })();
  }, [games]);
  return (
    <main className='py-4 min-h-screen'>
      <SyncAchievementsLoading isVisible={loading} />
    </main>
  );
}

export default Home;
