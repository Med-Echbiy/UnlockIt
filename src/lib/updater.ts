import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForAppUpdates(): Promise<void> {
  try {
    console.log("Checking for application updates...");

    const update = await check();

    if (update === null) {
      console.log("No updates available");
      return;
    }

    if (update.available) {
      console.log(`Update available: ${update.version}`);
      console.log(`Release notes: ${update.body}`);

      const shouldUpdate = await ask(
        `A new version ${update.version} is available!\n\n${update.body}\n\nDo you want to download and install it now?`,
        {
          title: "Update Available",
          kind: "info",
        }
      );

      if (shouldUpdate) {
        console.log("User accepted update. Starting download...");

        await message("Downloading update... Please wait.", {
          title: "Downloading Update",
          kind: "info",
        });

        try {
          console.log("Installing update...");
          await update.downloadAndInstall();

          const shouldRelaunch = await ask(
            "Update installed successfully! The application needs to restart to apply the changes. Do you want to restart now?",
            {
              title: "Restart Required",
              kind: "info",
            }
          );

          if (shouldRelaunch) {
            console.log("Relaunching application...");
            await relaunch();
          }
        } catch (error) {
          console.error("Error during update installation:", error);
          await message(`Failed to install update: ${error}`, {
            title: "Update Failed",
            kind: "error",
          });
        }
      } else {
        console.log("User declined update");
      }
    } else {
      console.log("Application is up to date");
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    // Silently fail for now - don't show error to user unless they manually check
  }
}

export async function checkForUpdatesManually(): Promise<void> {
  try {
    await checkForAppUpdates();
  } catch (error) {
    console.error("Manual update check failed:", error);
    await message(
      "Unable to check for updates at this time. Please try again later.",
      {
        title: "Update Check Failed",
        kind: "error",
      }
    );
  }
}
