import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForAppUpdates(): Promise<void> {
  try {
    console.log("🔍 Checking for application updates...");
    
    const update = await check();

    if (update === null) {
      console.log("✓ Already running the latest version");
      return;
    }

    if (update.available) {
      console.log(`✓ Update available: v${update.version}`);
      console.log(`Current version: v${update.currentVersion}`);
      console.log(`Release notes: ${update.body}`);
      
      const shouldUpdate = await ask(
        `A new version ${update.version} is available!\n\nRelease Notes:\n${update.body}\n\nDo you want to download and install it now?`,
        {
          title: "Update Available",
          kind: "info",
        }
      );

      if (shouldUpdate) {
        console.log("👤 User accepted update. Starting download...");
        
        await message("Downloading update... Please wait.", {
          title: "Downloading Update",
          kind: "info",
        });

        try {
          console.log("📥 Downloading and installing update...");
          await update.downloadAndInstall();
          
          console.log("✓ Update installed successfully!");

          const shouldRelaunch = await ask(
            "Update installed successfully! The application needs to restart to apply the changes. Do you want to restart now?",
            {
              title: "Restart Required",
              kind: "info",
            }
          );

          if (shouldRelaunch) {
            console.log("🔄 Restarting application...");
            await relaunch();
          } else {
            console.log("👤 User chose to restart later");
          }
        } catch (error) {
          console.error("❌ Failed to install update:", error);
          await message(`Failed to install update: ${error}`, {
            title: "Update Failed",
            kind: "error",
          });
        }
      } else {
        console.log("👤 User declined update");
      }
    } else {
      console.log("✓ No updates available - already running the latest version");
    }
  } catch (error) {
    console.error("❌ Update check failed:", error);
    // Silently fail for automatic checks - don't show error to user unless they manually check
    throw error; // Re-throw so manual checks can catch it
  }
}

export async function checkForUpdatesManually(): Promise<void> {
  try {
    console.log("🔍 Manual update check initiated...");
    
    const update = await check();
    
    if (update === null) {
      await message("You're already running the latest version!", {
        title: "No Updates Available",
        kind: "info",
      });
      return;
    }
    
    if (!update.available) {
      await message("You're already running the latest version!", {
        title: "No Updates Available",
        kind: "info",
      });
      return;
    }
    
    // If update is available, the checkForAppUpdates logic will handle it
    await checkForAppUpdates();
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
