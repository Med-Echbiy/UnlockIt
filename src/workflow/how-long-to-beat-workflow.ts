/*
goal of this workflow is to provide an interface for interacting with the HowLongToBeat API, allowing users to search for games and retrieve their completion times.

This is the main entry point that handles the complete workflow:
1. Call the API to search for a game by its name
2. Show an async dialog component and ask user to select the correct game
3. Use the appId to create a Tauri store entry to persist the selected game data
4. Store format: appid_beatTime

Usage: const selectedGame = await executeHowLongToBeatWorkflow(appId);
*/

import useHowLongToBeatStore from "@/store/how-long-to-beat-store";
import {
  HowLongToBeatResponse,
  HowLongToBeatGame,
} from "@/types/howLongToBeat";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { openHowLongToBeatSelection } from "@/components/main/shared/async-howLongToBeat-dialog";
import { load, Store } from "@tauri-apps/plugin-store";

const useHowLongToBeatWorkflow = () => {
  const {
    getHowLongToBeatDataById,
    addHowLongToBeatData,
    removeHowLongToBeatData,
    hasHowLongToBeatData,
  } = useHowLongToBeatStore();

  // Initialize Tauri store
  const getStore = async (): Promise<Store> => {
    return await load("howlongtobeat.json");
  };

  /**
   * Main workflow entry function - handles the complete HowLongToBeat process
   * @param appId - The game's app ID
   * @returns Selected game data or null if cancelled/failed
   */
  async function executeHowLongToBeatWorkflow(
    appId: string,
    name: string
  ): Promise<HowLongToBeatGame | null> {
    try {
      // Step 1: Get the game from our library
      // const game = getGameById(appId);
      // if (!game) {
      //   toast.error("Game not found in library");
      //   return null;
      // }

      // Step 2: Check if we already have stored data (check session store first, then persistent store)
      let existingData = getHowLongToBeatDataById(appId);
      if (!existingData) {
        const persistentData = await getStoredGameData(appId);
        if (persistentData) {
          // Add to session store for faster future access
          addHowLongToBeatData(appId, persistentData);
          existingData = persistentData;
        }
      }

      if (existingData) {
        toast.info(
          `Using saved HowLongToBeat data for ${existingData.game_name}`
        );
        return existingData;
      }

      // Step 3: Fetch HowLongToBeat data
      toast.info(`Searching HowLongToBeat for "${name}"...`);
      const searchResults = await fetchHowLongToBeatData(name);

      if (!searchResults || searchResults.length === 0) {
        toast.error("No HowLongToBeat data found for this game");
        return null;
      }

      // Step 4: Show dialog and wait for user selection
      const selectedGame = await openHowLongToBeatSelection(searchResults);

      if (!selectedGame) {
        toast.info("Selection cancelled");
        return null;
      }

      // Step 5: Save the selected game data (both to session and persistent storage)
      await saveGameData(appId, selectedGame);
      addHowLongToBeatData(appId, selectedGame);
      toast.success(`HowLongToBeat data saved for ${selectedGame.game_name}`);

      return selectedGame;
    } catch (error) {
      console.error("Error in HowLongToBeat workflow:", error);
      toast.error("Failed to complete HowLongToBeat workflow");
      return null;
    }
  }

  /**
   * Fetch HowLongToBeat data from API
   */
  async function fetchHowLongToBeatData(
    gameName: string
  ): Promise<HowLongToBeatResponse> {
    try {
      const response = await invoke("get_how_long_to_beat", {
        gameName: gameName,
      });

      console.log("HowLongToBeat API response:", { response });

      if (Array.isArray(response) && response.length > 0) {
        return response as HowLongToBeatResponse;
      }

      return [];
    } catch (error) {
      console.error("Error fetching HowLongToBeat data:", error);
      throw error;
    }
  }

  /**
   * Save selected game data to Tauri store
   */
  async function saveGameData(
    appId: string,
    selectedGame: HowLongToBeatGame
  ): Promise<void> {
    try {
      const store = await getStore();
      const storeKey = `${appId}_beatTime`;
      await store.set(storeKey, selectedGame);
      await store.save();
    } catch (error) {
      console.error("Error saving to store:", error);
      throw error;
    }
  }

  /**
   * Get stored game data from Tauri store
   */
  async function getStoredGameData(
    appId: string
  ): Promise<HowLongToBeatGame | null> {
    try {
      const store = await getStore();
      const storeKey = `${appId}_beatTime`;
      const storedData = await store.get<HowLongToBeatGame>(storeKey);
      return storedData || null;
    } catch (error) {
      console.error("Error retrieving from store:", error);
      return null;
    }
  }

  /**
   * Clear stored data for a specific game (both session and persistent)
   */
  async function clearStoredGameData(appId: string): Promise<void> {
    try {
      // Clear from session store
      removeHowLongToBeatData(appId);

      // Clear from persistent store
      const store = await getStore();
      const storeKey = `${appId}_beatTime`;
      await store.delete(storeKey);
      await store.save();
      toast.success("HowLongToBeat data cleared");
    } catch (error) {
      console.error("Error clearing store data:", error);
      toast.error("Failed to clear stored data");
    }
  }

  /**
   * Get data from session store (faster access)
   */
  function getSessionData(appId: string): HowLongToBeatGame | undefined {
    return getHowLongToBeatDataById(appId);
  }

  /**
   * Check if game has HowLongToBeat data in session
   */
  function hasSessionData(appId: string): boolean {
    return hasHowLongToBeatData(appId);
  }

  return {
    executeHowLongToBeatWorkflow,
    getStoredGameData,
    clearStoredGameData,
    getSessionData,
    hasSessionData,
  };
};

export default useHowLongToBeatWorkflow;
