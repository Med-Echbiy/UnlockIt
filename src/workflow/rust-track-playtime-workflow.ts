import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";

const useRustTrackPlaytimeWorkflow = (appid: string, exePath: string) => {
  const [playtime, setPlaytime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const startTracking = async () => {
    if (isRunning) return;

    try {
      // Start tracking via Rust command
      await invoke("start_playtime_tracking", {
        appid,
        exePath,
      });

      setIsRunning(true);

      // Update UI every second
      intervalRef.current = window.setInterval(async () => {
        try {
          const currentPlaytime = await invoke<number>("get_current_playtime", {
            appid,
          });
          setPlaytime(currentPlaytime);
        } catch (e) {
          console.error("Failed to get current playtime:", e);
        }
      }, 1000);
    } catch (e) {
      console.error("Failed to start playtime tracking:", e);
      throw e;
    }
  };

  const stopTracking = async (save = true) => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (save && isRunning) {
      try {
        const finalPlaytime = await invoke<number>("stop_playtime_tracking", {
          appid,
        });
        setPlaytime(finalPlaytime);
      } catch (e) {
        console.error("Failed to stop playtime tracking:", e);
      }
    }

    setIsRunning(false);
  };

  // Load initial playtime when component mounts
  useEffect(() => {
    const loadInitialPlaytime = async () => {
      try {
        const currentPlaytime = await invoke<number>("get_current_playtime", {
          appid,
        });
        setPlaytime(currentPlaytime);
      } catch (e) {
        console.error("Failed to load initial playtime:", e);
        setPlaytime(0);
      }
    };

    loadInitialPlaytime();
  }, [appid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { playtime, isRunning, startTracking, stopTracking };
};

export default useRustTrackPlaytimeWorkflow;
