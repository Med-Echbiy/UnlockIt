export function refreshTauriWindow() {
  try {
    // Use the webview's native reload functionality
    window.location.reload();
    console.log("Tauri window reloaded successfully.");
  } catch (error) {
    console.error("Error reloading Tauri window:", error);
  }
}
