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
    } catch (e) {}
  }

  async function handleProcessExit(_code?: number) {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    childRef.current = null;
    setIsRunning(false);
    await persistPlaytime(playtime);
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
      const command = Command.create(exePath, []);
      const child = await command.spawn();
      childRef.current = child;
      setIsRunning(true);
      if (child) {
        const anyChild = child as any;
        if (typeof anyChild.on === "function") {
          anyChild.on("close", (arg: any) => {
            const code = arg && typeof arg === "object" ? arg.code : arg;
            handleProcessExit(code);
          });
          anyChild.on("error", () => {
            handleProcessExit();
          });
        } else if (typeof anyChild.wait === "function") {
          anyChild
            .wait()
            .then((res: any) => handleProcessExit(res && res.code))
            .catch(() => handleProcessExit());
        }
      }
      intervalRef.current = window.setInterval(() => {
        setPlaytime((prev) => {
          const next = prev + 1;
          if (next % 30 === 0) persistPlaytime(next);
          return next;
        });
      }, 1000);
    } catch (e) {}
  };

  const stopTracking = async (save = true) => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
      (async () => {
        await persistPlaytime(playtime);
      })();
    };
  }, []);

  return { playtime, isRunning, startTracking, stopTracking };
};

export default useTrackPlaytimeWorkflow;
