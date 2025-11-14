export function refreshTauriWindow() {
  try {
    // Use the webview's native reload functionality
    window.location.reload();
  } catch (error) {
  }
}
