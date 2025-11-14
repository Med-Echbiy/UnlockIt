import useMyGamesStore from "@/store/my-games-store";
import { load } from "@tauri-apps/plugin-store";
import { toast } from "sonner";

const useRemoveGameWorkflow = () => {
  const { removeGame } = useMyGamesStore();

  const removeGameFromStore = async (appId: string) => {
    try {
      removeGame(appId);
      const store = await load("my-games.json");
      await store.delete(`game_${appId}`);
      await store.save();
      toast.success("Game removed successfully", {
        description: "The game has been removed from your library.",
        style: {
          background: "rgb(21 128 61)",
        },
      });

      return true;
    } catch (error) {
      toast.error("Failed to remove game", {
        description: "An error occurred while removing the game.",
        style: {
          background: "rgb(185 28 28)",
        },
      });
      return false;
    }
  };

  return { removeGameFromStore };
};

export default useRemoveGameWorkflow;
