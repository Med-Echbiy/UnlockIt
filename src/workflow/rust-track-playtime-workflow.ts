import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";

const useRustTrackPlaytimeWorkflow = (appid: string, exePath: string) => {
  const [playtime, setPlaytime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const startTracking = async () => {
    if (isRunning) return;

    try {
      await invoke("start_playtime_tracking", {
        appid,
        exePath,
      });

      setIsRunning(true);
      intervalRef.current = window.setInterval(async () => {
        try {
          const currentPlaytime = await invoke<number>("get_current_playtime", {
            appid,
          });
          setPlaytime(currentPlaytime);
        } catch (e) {}
      }, 1000);
    } catch (e) {
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
      } catch (e) {}
    }

    setIsRunning(false);
  };
  useEffect(() => {
    const loadInitialPlaytime = async () => {
      try {
        const currentPlaytime = await invoke<number>("get_current_playtime", {
          appid,
        });
        setPlaytime(currentPlaytime);
      } catch (e) {
        setPlaytime(0);
      }
    };

    loadInitialPlaytime();
  }, [appid]);
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
