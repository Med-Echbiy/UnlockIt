import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";
import useMyGamesStore from "@/store/my-games-store";
import { load } from "@tauri-apps/plugin-store";

const usePersistentPlaytimeWorkflow = (appid: string, exePath: string) => {
  const [playtime, setPlaytime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const processCheckRef = useRef<number | null>(null);
  const { setPlaytime: setStorePlaytime, getGameById } = useMyGamesStore();

  // Load both Tauri tracked playtime and manual playtime
  useEffect(() => {
    const loadTotalPlaytime = async () => {
      try {
        // Get Tauri tracked playtime
        const tauriPlaytime = await invoke<number>("get_current_playtime", {
          appid,
        });

        // Get manual playtime from store
        const game = getGameById(appid);
        const manualPlaytime = game?.playtime || 0;

        // Total is the sum of both
        const totalPlaytime = tauriPlaytime + manualPlaytime;
        setPlaytime(totalPlaytime);
      } catch (e) {
        const game = getGameById(appid);
        setPlaytime(game?.playtime || 0);
      }
    };

    loadTotalPlaytime();
  }, [appid, getGameById]);

  // Check if process is already running
  const checkProcessStatus = async (): Promise<boolean> => {
    try {
      const isRunning = await invoke<boolean>("check_process_status", {
        exePath,
      });
      return isRunning;
    } catch (e) {
      return false;
    }
  };

  // Start monitoring an already running process
  const startMonitoring = async (): Promise<boolean> => {
    try {
      const processRunning = await checkProcessStatus();
      if (!processRunning) {
        return false;
      }

      await invoke("start_process_monitoring", {
        appid,
        exePath,
      });

      setIsRunning(true);
      setIsMonitoring(true);
      startPlaytimeInterval();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Launch game and start tracking
  const startTrackingWithLaunch = async (): Promise<boolean> => {
    if (isRunning) {
      return true;
    }

    try {
      await invoke("start_playtime_tracking", {
        appid,
        exePath,
      });

      setIsRunning(true);
      setIsMonitoring(false);
      startPlaytimeInterval();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Smart start: check if process is running, if so monitor, if not launch
  const smartStart = async (): Promise<boolean> => {
    if (isRunning) {
      return true;
    }

    const processRunning = await checkProcessStatus();

    if (processRunning) {
      return await startMonitoring();
    } else {
      return await startTrackingWithLaunch();
    }
  };

  const startPlaytimeInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(async () => {
      try {
        // Get current Tauri tracked playtime
        const tauriPlaytime = await invoke<number>("get_current_playtime", {
          appid,
        });

        // Get manual playtime from store
        const game = getGameById(appid);
        const manualPlaytime = game?.playtime || 0;

        // Update total playtime
        const totalPlaytime = tauriPlaytime + manualPlaytime;
        setPlaytime(totalPlaytime);
      } catch (e) {
      }
    }, 1000);
  };

  const stopTracking = async (save = true): Promise<number> => {
    let finalPlaytime = playtime;

    // Clear intervals
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (processCheckRef.current !== null) {
      clearInterval(processCheckRef.current);
      processCheckRef.current = null;
    }

    if (save && isRunning) {
      try {
        // Get final Tauri tracked playtime
        const tauriPlaytime = await invoke<number>("stop_playtime_tracking", {
          appid,
        });

        // Get manual playtime from store
        const game = getGameById(appid);
        const manualPlaytime = game?.playtime || 0;

        // Calculate final total playtime
        finalPlaytime = tauriPlaytime + manualPlaytime;
        setPlaytime(finalPlaytime);
      } catch (e) {
      }
    }

    setIsRunning(false);
    setIsMonitoring(false);
    return finalPlaytime;
  };

  // Set manual playtime (allows user input)
  const setManualPlaytime = async (manualSeconds: number): Promise<void> => {
    try {
      // Update the store
      setStorePlaytime(appid, manualSeconds);

      // Update persistent storage
      const store = await load("my-games.json");
      const gameKey = `game_${appid}`;
      const gameData = await store.get(gameKey);

      if (gameData) {
        await store.set(gameKey, { ...gameData, playtime: manualSeconds });
        await store.save();
      }

      // Get current Tauri tracked playtime and update total
      const tauriPlaytime = await invoke<number>("get_current_playtime", {
        appid,
      });
      const totalPlaytime = tauriPlaytime + manualSeconds;
      setPlaytime(totalPlaytime);
    } catch (e) {
    }
  };

  // Periodic check for externally launched processes
  const startPeriodicProcessCheck = () => {
    if (processCheckRef.current !== null) {
      clearInterval(processCheckRef.current);
    }

    processCheckRef.current = window.setInterval(async () => {
      if (!isRunning) {
        const processRunning = await checkProcessStatus();
        if (processRunning) {
          await startMonitoring();
        }
      }
    }, 30000);
  };

  // Start periodic checks when component mounts
  useEffect(() => {
    startPeriodicProcessCheck();

    return () => {
      // Cleanup on unmount
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (processCheckRef.current !== null) {
        clearInterval(processCheckRef.current);
        processCheckRef.current = null;
      }
    };
  }, []);

  // Format playtime for display
  const formatPlaytime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${secs}s`;
    }
  };

  return {
    playtime,
    isRunning,
    isMonitoring,
    formatPlaytime: () => formatPlaytime(playtime),
    smartStart,
    startTrackingWithLaunch,
    startMonitoring,
    stopTracking,
    checkProcessStatus,
    setManualPlaytime,
  };
};

export default usePersistentPlaytimeWorkflow;
