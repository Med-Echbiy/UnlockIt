# Enhanced Playtime Tracking System

## Overview

The enhanced playtime tracking system in UnlockIt provides robust, persistent playtime tracking that works in multiple scenarios:

1. **Launch and Track**: Start games from within UnlockIt and track playtime
2. **Monitor External Launches**: Automatically detect and track games launched outside the app
3. **Persistent Storage**: Playtime data is preserved between app sessions
4. **Background Monitoring**: Continuously monitor for game processes

## Features

### ✅ Persistent Playtime Storage

- Playtime is automatically saved and persists between app restarts
- Data is stored in `%APPDATA%/UnlockIt/playtimes.json`
- Automatic backup and recovery of playtime data

### ✅ Smart Process Detection

- Detects if a game is already running when you click "Play"
- Automatically switches to monitoring mode for externally launched games
- Periodic background checks for game processes (every 10 seconds)

### ✅ Enhanced Game Launch

- Improved process spawning with elevated privileges when needed
- Better error handling for launch failures
- Continues tracking even if launch fails (useful for Steam games, etc.)

### ✅ Real-time Tracking

- Live playtime updates every second
- Automatic saving every 30 seconds during gameplay
- Session time calculation and accumulation

## API Reference

### Rust Backend Commands

#### `start_playtime_tracking`

Launches a game and starts tracking playtime.

```rust
#[tauri::command]
async fn start_playtime_tracking(
    appid: String,
    exe_path: String,
) -> Result<(), String>
```

#### `start_process_monitoring`

Monitors an already running game process.

```rust
#[tauri::command]
async fn start_process_monitoring(
    appid: String,
    exe_path: String,
) -> Result<(), String>
```

#### `check_process_status`

Checks if a game process is currently running.

```rust
#[tauri::command]
async fn check_process_status(
    exe_path: String,
) -> Result<bool, String>
```

#### `get_current_playtime`

Gets the current total playtime for a game.

```rust
#[tauri::command]
async fn get_current_playtime(
    appid: String,
) -> Result<u64, String>
```

#### `stop_playtime_tracking`

Stops tracking and saves final playtime.

```rust
#[tauri::command]
async fn stop_playtime_tracking(
    appid: String,
) -> Result<u64, String>
```

### TypeScript Hook

#### `useEnhancedTrackPlaytimeWorkflow`

```typescript
const {
  isRunning, // Whether tracking is active
  isMonitoring, // Whether monitoring an external process
  formatPlaytime, // Function to format playtime as string
  smartStart, // Smart start function (launch or monitor)
  stopTracking, // Stop tracking function
} = useEnhancedTrackPlaytimeWorkflow(appId, exePath);
```

### Hook Methods

#### `smartStart()`

Intelligently starts tracking:

- Checks if game is already running
- If running: starts monitoring mode
- If not running: launches game and tracks

#### `startTrackingWithLaunch()`

Always attempts to launch the game and start tracking.

#### `startMonitoring()`

Monitors an already running game process.

#### `stopTracking(save?: boolean)`

Stops tracking and optionally saves playtime data.

#### `checkProcessStatus()`

Returns whether the game process is currently running.

#### `formatPlaytime()`

Returns formatted playtime string (e.g., "2h 34m 15s").

## Usage Examples

### Basic Usage in React Component

```typescript
import useEnhancedTrackPlaytimeWorkflow from "@/workflow/enhanced-track-playtime-workflow";

function GameComponent({ game }) {
  const { isRunning, isMonitoring, formatPlaytime, smartStart, stopTracking } =
    useEnhancedTrackPlaytimeWorkflow(game.appId, game.exePath);

  return (
    <div>
      {!isRunning ? (
        <button onClick={smartStart}>Play Game</button>
      ) : (
        <button onClick={() => stopTracking()}>Stop Tracking</button>
      )}

      <div>Playtime: {formatPlaytime()}</div>

      {isRunning && (
        <div className='status'>
          {isMonitoring
            ? "Monitoring External Process"
            : "Tracking Launched Process"}
        </div>
      )}
    </div>
  );
}
```

### Manual Process Monitoring

```typescript
// Check if game is running externally
const isRunning = await checkProcessStatus();

if (isRunning) {
  // Start monitoring the external process
  await startMonitoring();
} else {
  // Launch the game
  await startTrackingWithLaunch();
}
```

## Data Storage

Playtime data is stored in JSON format:

```json
{
  "123456": 7890, // appId: playtime in seconds
  "789012": 12345,
  "345678": 5678
}
```

**File Location**: `%APPDATA%/UnlockIt/playtimes.json`

## Process Monitoring Logic

1. **Startup Check**: When tracking starts, check if process already exists
2. **Launch Handling**: Attempt to launch if not running, continue tracking regardless
3. **Background Monitoring**: Monitor process status every 3 seconds while tracking
4. **External Detection**: Periodic checks every 10 seconds for externally launched games
5. **Graceful Shutdown**: Automatic save when process ends or app closes

## Error Handling

- **Launch Failures**: App continues monitoring in case game was launched externally
- **Permission Issues**: Automatic elevation attempts for games requiring admin rights
- **Storage Errors**: Graceful fallback with console logging
- **Process Detection**: Robust process name matching across different launch methods

## Best Practices

1. **Always use `smartStart()`** for the best user experience
2. **Handle loading states** while process detection occurs
3. **Show appropriate status indicators** (monitoring vs tracking)
4. **Implement proper cleanup** in component unmount
5. **Test with various game types** (Steam, standalone, etc.)

## Troubleshooting

### Common Issues

1. **Playtime resets**:

   - Check file permissions on `%APPDATA%/UnlockIt/`
   - Verify the playtime file isn't being deleted

2. **Process not detected**:

   - Ensure the executable path is correct
   - Check if the process name matches the executable

3. **Permission denied**:
   - Try running UnlockIt as administrator
   - Check antivirus software blocking access

### Debug Information

Enable verbose logging by checking the console output. Key log messages include:

- "Starting playtime tracking for {appId}"
- "Loaded existing playtime: {seconds}s"
- "Process {name} is already running, starting tracking"
- "Successfully saved playtime: {seconds} seconds"

## Migration from Old System

The new system is backward compatible. Existing playtime data will be automatically loaded and preserved. The old workflow can be replaced with minimal code changes:

### Before:

```typescript
const { playtime, isRunning, startTracking, stopTracking } =
  useRustTrackPlaytimeWorkflow(appId, exePath);
```

### After:

```typescript
const { isRunning, formatPlaytime, smartStart, stopTracking } =
  useEnhancedTrackPlaytimeWorkflow(appId, exePath);
```

## Performance Considerations

- Background checks run every 10 seconds (low CPU impact)
- Process monitoring occurs every 3 seconds during active tracking
- Playtime auto-saves every 30 seconds to prevent data loss
- Memory usage is minimal with efficient process management
