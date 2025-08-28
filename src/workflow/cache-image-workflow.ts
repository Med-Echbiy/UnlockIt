import { appLocalDataDir } from "@tauri-apps/api/path";
import { fetch } from "@tauri-apps/plugin-http";
import { mkdir, writeFile, readFile } from "@tauri-apps/plugin-fs";
function joinPath(base: string, ...parts: string[]) {
  const useBackslash = base.includes("\\");
  const sep = useBackslash ? "\\" : "/";
  const normalize = (s: string) => s.replace(/^[\\/]+|[\\/]+$/g, "");
  const b = base.replace(/[\\/]+$/g, "");
  const rest = parts.map((p) => normalize(p));
  return [b, ...rest].filter(Boolean).join(sep);
}
const useCacheImageWorkflow = () => {
  async function createAssetsDir() {
    const dir = await appLocalDataDir();
    const assetsDir = joinPath(dir, "assets");
    await mkdir(assetsDir, { recursive: true });
    return assetsDir;
  }

  async function downloadImage(url: string, fileName: string) {
    const assetsDir = await createAssetsDir();
    const response = await fetch(url);

    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const filePath = joinPath(assetsDir, fileName);

    await writeFile(filePath, uint8);
    return filePath;
  }

  async function loadImage(fileName: string) {
    const dir = await appLocalDataDir();
    const filePath = joinPath(dir, "assets", fileName);
    const data = await readFile(filePath);
    return URL.createObjectURL(new Blob([data]));
  }

  async function isImageCached(fileName: string) {
    const dir = await appLocalDataDir();
    const filePath = joinPath(dir, "assets", fileName);
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
