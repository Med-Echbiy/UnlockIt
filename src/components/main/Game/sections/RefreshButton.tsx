import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function RefreshButton({
  onRefresh,
  isRefreshing,
  canRefresh,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: () => Promise<{ canRefresh: boolean; timeRemaining?: number }>;
}) {
  const [refreshStatus, setRefreshStatus] = useState<{
    canRefresh: boolean;
    timeRemaining?: number;
  }>({ canRefresh: true });
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const checkRefreshStatus = async () => {
      const status = await canRefresh();
      setRefreshStatus(status);

      if (!status.canRefresh && status.timeRemaining) {
        const hours = Math.floor(status.timeRemaining / 3600000);
        const minutes = Math.floor((status.timeRemaining % 3600000) / 60000);
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining("");
      }
    };

    checkRefreshStatus();
    // Update every minute to show accurate countdown
    const interval = setInterval(checkRefreshStatus, 60000);

    return () => clearInterval(interval);
  }, [canRefresh]);

  const buttonText = isRefreshing ? "Refreshing..." : "Refresh Achievements";

  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant='default'
      title={
        !refreshStatus.canRefresh
          ? `Refresh achievement files (always available) and data. Steam percentage fetching in cooldown: ${timeRemaining}. File checking has no limits.`
          : "Refresh achievement files and fetch latest percentages from Steam API"
      }
    >
      {buttonText}
      <RefreshCcw className={isRefreshing ? "animate-spin" : ""} />
    </Button>
  );
}
