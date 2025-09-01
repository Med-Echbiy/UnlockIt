import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeClosed,
  User,
  Volume2,
  Camera,
  Play,
  Download,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import settingsModalStore from "@/store/settings-modal-state";
import useProfileStore from "@/store/profile-store";
import gsap from "gsap";
import { toast } from "sonner";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { checkForUpdatesManually } from "@/lib/updater";

function SettingsDialog() {
  const [showToken, setShowToken] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [tempName, setTempName] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const { open, toggle } = settingsModalStore();
  const {
    getProfile,
    updateName,
    updateAvatar,
    updateNotificationSound,
    loadProfile,
  } = useProfileStore();
  const [profilePicture, setProfilePicture] = useState("");
  const availableSounds = [
    { name: "PlayStation 5", value: "ps5.mp3" },
    { name: "Xbox 360", value: "xbox-360.mp3" },
    { name: "Xbox Rare Achievement", value: "xbox-rare.mp3" },
  ];
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (open && dialogRef.current) {
      gsap.fromTo(
        dialogRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [open]);

  useEffect(() => {
    (async () => {
      setProfilePicture(
        await invoke("load_image", { path: getProfile().avatar })
      );
    })();
    const storedApiKey = window.localStorage.getItem("steamApiKey");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    loadProfile();
  }, [loadProfile, getProfile().avatar]);

  useEffect(() => {
    setTempName(getProfile().name);
  }, [getProfile().name]);

  const handleAvatarUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Image",
            extensions: ["png", "jpg", "jpeg", "gif", "webp"],
          },
        ],
      });

      if (selected) {
        updateAvatar(selected);
        toast.success("Avatar updated successfully!", {
          style: {
            background: "rgb(21 128 61)",
          },
        });
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Failed to upload avatar", {
        style: {
          background: "rgb(185 28 28)",
        },
      });
    }
  };

  const playNotificationSound = async (soundFile: string) => {
    try {
      const audio = new Audio(`${soundFile}`);
      audio.play();
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      updateName(tempName.trim());
      toast.success("Name updated successfully!", {
        style: {
          background: "rgb(21 128 61)",
        },
      });
    }
  };
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
      await invoke("fetch_achievements", {
        apiKey: apiKey.trim(),
        appid: SUBNAUTICA_APP_ID,
      });
      toast.success("Your Steam API key is valid.", {
        style: {
          background: "rgb(21 128 61)",
        },
      });
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

  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogContent
        ref={dialogRef}
        className='max-w-4xl w-full bg-background max-h-[90vh] overflow-y-auto'
      >
        <DialogHeader>
          <DialogTitle className='text-3xl font-bold mb-2 text-center'>
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className='px-6 pb-6 pt-2 space-y-8'>
          {/* Profile Section */}
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <User className='h-6 w-6 text-primary' />
              <h2 className='text-xl font-semibold'>Profile</h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='profile-name'>Display Name</Label>
                  <div className='flex gap-2'>
                    <Input
                      id='profile-name'
                      type='text'
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder='Enter your display name'
                    />
                    <Button
                      onClick={handleNameSave}
                      disabled={
                        !tempName.trim() || tempName === getProfile().name
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
              <div className='space-y-4'>
                <Label>Profile Avatar</Label>
                <div className='flex items-center gap-4'>
                  <div className='w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center overflow-hidden'>
                    {getProfile().avatar ? (
                      <img
                        src={profilePicture}
                        alt='Profile'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <User className='h-8 w-8 text-primary' />
                    )}
                  </div>
                  <Button
                    onClick={handleAvatarUpload}
                    variant='outline'
                    className='flex items-center gap-2'
                  >
                    <Camera className='h-4 w-4' />
                    Change Avatar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <Volume2 className='h-6 w-6 text-primary' />
              <h2 className='text-xl font-semibold'>Notifications</h2>
            </div>

            <div className='space-y-4'>
              <Label>Notification Sound</Label>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {availableSounds.map((sound) => (
                  <div
                    key={sound.value}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                      getProfile().notificationSound === sound.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => {
                      updateNotificationSound(sound.value);
                      toast.success(
                        `Notification sound changed to ${sound.name}`,
                        {
                          style: {
                            background: "rgb(21 128 61)",
                          },
                        }
                      );
                    }}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-medium'>{sound.name}</span>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          playNotificationSound(sound.value);
                        }}
                        className='h-8 w-8 p-0'
                      >
                        <Play className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Steam API Section */}
          <div className='space-y-6'>
            <h2 className='text-xl font-semibold'>Steam Integration</h2>
            <p className='text-muted-foreground'>
              Manage your Steam API preferences here.
            </p>
            <div className='relative w-full grid grid-cols-1 gap-4'>
              <Label>Steam API Token</Label>
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
                onClick={async () => {
                  setIsCheckingUpdates(true);
                  try {
                    await checkForUpdatesManually();
                    toast.success("Update check completed!");
                  } catch (error) {
                    console.error("Update check failed:", error);
                    toast.error("Failed to check for updates");
                  } finally {
                    setIsCheckingUpdates(false);
                  }
                }}
                disabled={isCheckingUpdates}
                variant='outline'
                className='mt-2'
              >
                <Download className='w-4 h-4 mr-2' />
                {isCheckingUpdates ? "Checking..." : "Check for Updates"}
              </Button>
              <Button
                onClick={fetchSubnauticaAchievements}
                disabled={isLoading || !apiKey.trim()}
                className='mt-4'
              >
                {isLoading ? "Please Wait..." : "Save"}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await invoke("toast_notification", {
                      iconPath: "",
                      gameName: "UnlockIt Settings",
                      achievementName: "Test Notification Working!",
                      soundPath: getProfile().notificationSound,
                      hero: "",
                      progress: null,
                      isRare: false,
                    });
                    toast.success("Test notification sent!");
                  } catch (error) {
                    console.error("Test notification failed:", error);
                    toast.error("Test notification failed: " + error);
                  }
                }}
                variant='outline'
                className='mt-2'
              >
                Test Toast Notification
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
