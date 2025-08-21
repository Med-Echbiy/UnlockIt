import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeClosed } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import settingsModalStore from "@/store/settings-modal-state";
import gsap from "gsap";
import { toast } from "sonner";

function SettingsDialog() {
  const [showToken, setShowToken] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { open, toggle } = settingsModalStore();

  // Animate dialog entrance with GSAP
  useEffect(() => {
    if (open && dialogRef.current) {
      gsap.fromTo(
        dialogRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [open]);
  useEffect(() => {
    const storedApiKey = window.localStorage.getItem("steamApiKey");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);
  // Subnautica Steam App ID
  const SUBNAUTICA_APP_ID = "264710";

  const fetchSubnauticaAchievements = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Steam API key first", {
        description:
          "You need to provide a valid API key to fetch achievements.",
        duration: 3000,
        style: {
          background: "#b91c1c",
        },
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await invoke("fetch_achievements", {
        apiKey: apiKey.trim(),
        appid: SUBNAUTICA_APP_ID,
      });
      toast.success("Your Steam API key is valid.", {
        style: {
          background: "rgb(21 128 61)",
        },
      });
      // store user api key in Localstorage
      window.localStorage.setItem("steamApiKey", apiKey.trim());
    } catch (error) {
      toast.error(`Error: ${error}`, {
        description:
          "Your Api Key is incorrect please make sure to enter a valid one",
        style: {
          background: "#b91c1c",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    console.log("Settings dialog mounted");
    console.log({ open });
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogContent ref={dialogRef} className='max-w-2xl w-full bg-background'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold mb-2'>
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className='px-6 pb-6 pt-2'>
          <p className='text-muted-foreground mb-6'>
            Manage your preferences and settings here.
          </p>
          <div className='relative w-full grid grid-cols-1 gap-4'>
            <Label>Please Add Your Steam API Token Here</Label>
            <Input
              type={showToken ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='Enter your Steam API key'
            />
            {!showToken ? (
              <Eye
                className='absolute top-9 right-3 cursor-pointer'
                onClick={() => setShowToken(true)}
              />
            ) : (
              <EyeClosed
                className='absolute top-9 right-3 cursor-pointer'
                onClick={() => setShowToken(false)}
              />
            )}
            <Button
              onClick={fetchSubnauticaAchievements}
              disabled={isLoading || !apiKey.trim()}
              className='mt-4'
            >
              {isLoading ? "Please Wait..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
