"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * CheckConnection
 * Renders a small WiFi status icon at the top-left of the app that reflects
 * the current navigator.onLine state. No toasts are shown on initial mount.
 */
function CheckConnection() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div
      aria-hidden
      className='fixed top-0 right-2 z-50 flex items-center gap-2 p-2 rounded-full shadow-md select-none'
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
          online ? "bg-green-600" : "bg-red-600"
        }`}
        title={online ? "Online" : "Offline"}
      >
        {online ? (
          <Wifi className='w-5 h-5 text-white' />
        ) : (
          <WifiOff className='w-5 h-5 text-white' />
        )}
      </div>
    </div>
  );
}

export default CheckConnection;
