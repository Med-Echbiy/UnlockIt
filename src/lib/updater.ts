import { ask, message } from "@tauri-apps/plugin-dialog";
import { fetch } from "@tauri-apps/plugin-http";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

const GITHUB_API_URL =
  "https://api.github.com/repos/Med-Echbiy/UnlockIt/releases/latest";

const UPDATE_CHECK_KEY = "update_check_performed";

function hasUpdateCheckBeenPerformed(): boolean {
  return sessionStorage.getItem(UPDATE_CHECK_KEY) === "true";
}

function markUpdateCheckPerformed(): void {
  sessionStorage.setItem(UPDATE_CHECK_KEY, "true");
}

function compareVersions(current: string, latest: string): boolean {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

export async function checkForAppUpdates(): Promise<void> {
  // Skip if already checked during this session
  if (hasUpdateCheckBeenPerformed()) {
    console.log("⏭️ Update check skipped - already checked this session");
    return;
  }

  try {
    console.log("🔍 Checking for application updates...");

    const currentVersion = await getVersion();

    const response = await fetch(GITHUB_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = (await response.json()) as any;
    const latestVersion = data.tag_name.replace("v", "");

    console.log(`Current version: ${currentVersion}`);
    console.log(`Latest version: ${latestVersion}`);

    if (compareVersions(currentVersion, latestVersion)) {
      console.log(`✓ Update available: v${latestVersion}`);

      markUpdateCheckPerformed(); // Mark as checked

      const msiAsset = data.assets.find((asset: any) =>
        asset.name.endsWith(".msi")
      );

      if (!msiAsset) {
        console.error("No MSI installer found in release");
        return;
      }

      const shouldUpdate = await ask(
        `A new version ${latestVersion} is available!\n\nDo you want to download and install it now?`,
        {
          title: "Update Available",
          kind: "info",
        }
      );

      if (shouldUpdate) {
        console.log("👤 User accepted update. Downloading installer...");

        try {
          invoke("download_and_install_update", {
            url: msiAsset.browser_download_url,
          });
          console.log("✓ Installer launched");
        } catch (error) {
          console.error("Failed to download/install:", error);
          await message(`Failed to download update: ${error}`, {
            title: "Update Failed",
            kind: "error",
          });
        }
      } else {
        console.log("👤 User declined update");
      }
    } else {
      console.log("✓ Already running the latest version");
      markUpdateCheckPerformed(); // Mark as checked even if no update
    }
  } catch (error) {
    console.error("❌ Update check failed:", error);
    markUpdateCheckPerformed(); // Don't keep retrying if it fails
    throw error;
  }
}

export async function checkForUpdatesManually(): Promise<void> {
  try {
    console.log("🔍 Manual update check initiated...");

    const currentVersion = await getVersion();

    const response = await fetch(GITHUB_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = (await response.json()) as any;
    const latestVersion = data.tag_name.replace("v", "");

    if (!compareVersions(currentVersion, latestVersion)) {
      await message("You're already running the latest version!", {
        title: "No Updates Available",
        kind: "info",
      });
      return;
    }

    // Update available - show the dialog
    const msiAsset = data.assets.find((asset: any) =>
      asset.name.endsWith(".msi")
    );

    if (!msiAsset) {
      console.error("No MSI installer found in release");
      return;
    }

    const shouldUpdate = await ask(
      `A new version ${latestVersion} is available!\n\nDo you want to download and install it now?`,
      {
        title: "Update Available",
        kind: "info",
      }
    );

    if (shouldUpdate) {
      console.log("👤 User accepted update. Downloading installer...");

      try {
        invoke("download_and_install_update", {
          url: msiAsset.browser_download_url,
        });
        console.log("✓ Installer launched");
      } catch (error) {
        console.error("Failed to download/install:", error);
        await message(`Failed to download update: ${error}`, {
          title: "Update Failed",
          kind: "error",
        });
      }
    } else {
      console.log("👤 User declined update");
    }
  } catch (error) {
    console.error("❌ Manual update check failed:", error);
    await message(
      `Unable to check for updates at this time.\n\nError: ${error}\n\nPlease check your internet connection and try again later.`,
      {
        title: "Update Check Failed",
        kind: "error",
      }
    );
  }
}
