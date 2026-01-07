import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WallpaperSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName: string;
  appId: string;
  currentImagePath?: string;
  onWallpaperSelected: (imagePath: string) => void;
}

export function WallpaperSelector({
  open,
  onOpenChange,
  gameName,
  appId,
  currentImagePath,
  onWallpaperSelected,
}: WallpaperSelectorProps) {
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchWallpapers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Searching for wallpapers with game name:", gameName);
      const urls = await invoke<string[]>("search_game_wallpapers", {
        gameName,
      });
      console.log("Found wallpaper URLs:", urls);
      setWallpapers(urls);
    } catch (err) {
      console.error("Error searching wallpapers:", err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWallpaper = async (imageUrl: string) => {
    setDownloading(imageUrl);
    try {
      const savedPath = await invoke<string>("download_and_save_wallpaper", {
        imageUrl,
        gameName,
        appId,
        oldImagePath: currentImagePath || null,
      });
      onWallpaperSelected(savedPath);
      onOpenChange(false);
    } catch (err) {
      console.error("Error downloading wallpaper:", err);
      setError(err as string);
    } finally {
      setDownloading(null);
    }
  };

  // Auto-search when dialog opens
  useState(() => {
    if (open && wallpapers.length === 0 && !loading) {
      searchWallpapers();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>Select Wallpaper for {gameName}</DialogTitle>
          <DialogDescription>
            Choose a wallpaper from the search results below
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          {/* Search Button */}
          <Button
            onClick={searchWallpapers}
            disabled={loading}
            className='w-full'
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Searching...
              </>
            ) : (
              "Search for Wallpapers"
            )}
          </Button>

          {/* Error Message */}
          {error && (
            <div className='bg-destructive/10 text-destructive p-4 rounded-lg'>
              <p className='font-semibold'>Error:</p>
              <p className='text-sm'>{error}</p>
            </div>
          )}

          {/* Image Grid */}
          <ScrollArea className='h-[calc(90vh-200px)] w-full'>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4 pr-4'>
              {wallpapers.map((url, index) => (
                <div
                  key={index}
                  className='relative group cursor-pointer rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all'
                  onClick={() => handleSelectWallpaper(url)}
                >
                  <img
                    src={url}
                    alt={`Wallpaper ${index + 1}`}
                    className='w-full h-48 object-cover'
                    loading='lazy'
                  />
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center'>
                    <Button
                      variant='secondary'
                      size='sm'
                      className='opacity-0 group-hover:opacity-100 transition-opacity'
                      disabled={downloading === url}
                    >
                      {downloading === url ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className='mr-2 h-4 w-4' />
                          Select
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading State */}
            {loading && wallpapers.length === 0 && (
              <div className='flex items-center justify-center h-[200px]'>
                <div className='text-center'>
                  <Loader2 className='h-8 w-8 animate-spin mx-auto mb-2' />
                  <p className='text-muted-foreground'>
                    Searching for wallpapers...
                  </p>
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && wallpapers.length === 0 && !error && (
              <div className='flex items-center justify-center h-[200px]'>
                <p className='text-muted-foreground'>
                  Click "Search for Wallpapers" to find images
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
