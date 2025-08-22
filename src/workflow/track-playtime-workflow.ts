import { load } from "@tauri-apps/plugin-store";
import { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";

const useTrackPlaytimeWorkflow = (appid: string, exePath: string) => {
  const [playtime, setPlaytime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const childRef = useRef<any | null>(null);

  async function persistPlaytime(value: number) {
    try {
      const store = await load("playtimes.json");
      store.set(appid, value);
      await store.save();
    } catch (e) {
      console.error("Failed to persist playtime", e);
    }
  }

  async function handleProcessExit(code?: number) {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    childRef.current = null;
    setIsRunning(false);
    await persistPlaytime(playtime);
    // log exit code when available
    if (typeof code !== "undefined") console.log("process exited", code);
  }

  const startTracking = async () => {
    if (isRunning) return;

    try {
      const store = await load("playtimes.json");
      const stored = store.get(appid);
      setPlaytime(typeof stored === "number" ? stored : 0);
    } catch (e) {
      setPlaytime(0);
    }

    try {
      // create command using exePath as the program to run
      const command = Command.create(exePath, []);
      const child = await command.spawn();
      childRef.current = child;
      setIsRunning(true);

      // Attach event listeners if available
      if (child) {
        const anyChild = child as any;
        if (typeof anyChild.on === "function") {
          // some runtimes emit an object or (code) depending on implementation
          anyChild.on("close", (arg: any) => {
            const code = arg && typeof arg === "object" ? arg.code : arg;
            handleProcessExit(code);
          });
          anyChild.on("error", (e: any) => {
            console.error("Process error:", e);
            handleProcessExit();
          });
        } else if (typeof anyChild.wait === "function") {
          // some Child implementations expose a wait/exit promise
          anyChild
            .wait()
            .then((res: any) => handleProcessExit(res && res.code))
            .catch(() => handleProcessExit());
        }
      }

      // Tick every second
      intervalRef.current = window.setInterval(() => {
        setPlaytime((prev) => {
          const next = prev + 1;
          if (next % 30 === 0) persistPlaytime(next);
          return next;
        });
      }, 1000);
    } catch (e) {
      console.error("Failed to spawn process:", e);
    }
  };

  const stopTracking = async (save = true) => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // don't forcibly kill the child by default
    childRef.current = null;
    setIsRunning(false);
    if (save) await persistPlaytime(playtime);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // persist last known playtime
      (async () => {
        await persistPlaytime(playtime);
      })();
    };
  }, []);

  return { playtime, isRunning, startTracking, stopTracking };
};

export default useTrackPlaytimeWorkflow;
