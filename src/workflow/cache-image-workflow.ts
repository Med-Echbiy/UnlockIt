import { appDataDir } from "@tauri-apps/api/path";
import { fetch } from "@tauri-apps/plugin-http";
import { mkdir, writeFile, readFile } from "@tauri-apps/plugin-fs";
const useCacheImageWorkflow = () => {
  async function createAssetsDir() {
    const dir = await appDataDir();
    const assetsDir = `${dir}assets`;
    await mkdir(assetsDir, { recursive: true });
    return assetsDir;
  }

  async function downloadImage(url: string, fileName: string) {
    const assetsDir = await createAssetsDir();
    // Fetch the image as a Response object
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.status}`);
    // Get binary data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const filePath = `${assetsDir}/${fileName}`;
    await writeFile(filePath, uint8);
    return filePath;
  }

  async function loadImage(fileName: string) {
    const dir = await appDataDir();
    const filePath = `${dir}assets/${fileName}`;
    const data = await readFile(filePath);
    // readFile returns Uint8Array, convert to Blob
    return URL.createObjectURL(new Blob([data]));
  }

  async function isImageCached(fileName: string) {
    const dir = await appDataDir();
    const filePath = `${dir}assets/${fileName}`;
    try {
      await readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }

  return { loadImage, downloadImage, isImageCached };
};
export default useCacheImageWorkflow;
