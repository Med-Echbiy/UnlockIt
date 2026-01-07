import { invoke } from "@tauri-apps/api/core";

// Simple in-memory cache for loaded images
const imageCache = new Map<string, string>();

// Maximum cache size (number of images) - adjust based on your needs
const MAX_CACHE_SIZE = 100;

// LRU tracking: track access order
const accessOrder: string[] = [];

/**
 * Load an image with caching support (with LRU eviction)
 * @param path - The file path of the image to load
 * @returns The loaded image data (base64 string)
 */
export async function loadImageWithCache(path: string): Promise<string> {
  // Check if image is already in cache
  if (imageCache.has(path)) {
    // Update access order for LRU
    const index = accessOrder.indexOf(path);
    if (index > -1) {
      accessOrder.splice(index, 1);
    }
    accessOrder.push(path);
    return imageCache.get(path)!;
  }

  // Load the image from disk
  const loadedImage = await invoke<string>("load_image", { path });

  // Evict least recently used item if cache is full
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const lruPath = accessOrder.shift(); // Remove oldest
    if (lruPath) {
      imageCache.delete(lruPath);
    }
  }

  // Store in cache for future use
  imageCache.set(path, loadedImage);
  accessOrder.push(path);

  return loadedImage;
}
/**
 * Clear the entire image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Remove a specific image from the cache
 * @param path - The file path of the image to remove
 */
export function removeImageFromCache(path: string): void {
  imageCache.delete(path);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: imageCache.size,
    paths: Array.from(imageCache.keys()),
  };
}
