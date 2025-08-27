// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde_json::json;
use std::collections::HashMap;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command as StdCommand, Stdio};
use std::sync::mpsc::channel as std_channel;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
// notify crate is used to watch filesystem events
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};
//how long to beat
// Structure to manage running processes and their playtimes
#[derive(Default)]
struct ProcessManager {
    processes: Arc<Mutex<HashMap<String, ProcessInfo>>>,
}

struct ProcessInfo {
    start_time: Instant,
    accumulated_time: u64, // in seconds
    is_running: bool,
}

impl ProcessManager {
    fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
#[tauri::command]
async fn fetch_achievements(api_key: String, appid: String) -> Result<serde_json::Value, String> {
    // Use GetSchemaForGame instead of GetPlayerAchievements since we don't have a steam_id
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid={}&key={}&l={}",
        appid, api_key, "english"
    );

    println!("Fetching from URL: {}", url);

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    println!("HTTP Status: {}", status);

    if !status.is_success() {
        return Err(format!(
            "HTTP error: {} - {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        ));
    }

    // Get response text first to debug
    let response_text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    println!("Raw response: {}", response_text);

    // Try to parse the JSON
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| {
        format!(
            "JSON parsing error: {} - Raw response: {}",
            e, response_text
        )
    })?;

    println!("Parsed JSON: {:#?}", json);
    Ok(json)
}
#[tauri::command]
async fn store_achievements_by_appid(
    app_handle: tauri::AppHandle,
    app_id: String,
    content: String,
) -> Result<(), String> {
    // Get the app data directory using Tauri v2 API
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let folder_path = app_data_dir
        .join("UnlockIt")
        .join("Achievements")
        .join(&app_id);
    create_dir_all(&folder_path).map_err(|e| e.to_string())?;

    let file_path = folder_path.join("data.ini");

    // Open file and append
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;

    writeln!(file, "{}", content).map_err(|e| e.to_string())?;

    println!(
        "Stored achievements for app {} in: {:?}",
        app_id, folder_path
    );
    Ok(())
}
#[tauri::command]
async fn fetch_game_metadata_from_steam(app_id: String) -> Result<serde_json::Value, String> {
    // 1. Fetch from Steam
    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}",
        app_id
    );
    println!("Fetching game metadata from URL: {}", url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    let status = resp.status();
    println!("HTTP Status: {}", status);
    if !status.is_success() {
        return Err(format!(
            "HTTP error: {} - {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        ));
    }
    let response_text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;
    println!("Raw response: {}", response_text);
    let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| {
        format!(
            "JSON parsing error: {} - Raw response: {}",
            e, response_text
        )
    })?;
    let app_data = if let Some(app_data) = json.get(&app_id).and_then(|v| v.get("data")) {
        app_data.clone()
    } else {
        serde_json::Value::Null
    };

    Ok(app_data)
}
#[tauri::command]
fn load_image(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine};
    use std::fs;

    let bytes = fs::read(&path).map_err(|e| e.to_string())?;

    // Guess MIME type from extension
    let mime = if let Some(ext) = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
    {
        match ext.to_lowercase().as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "application/octet-stream",
        }
    } else {
        "application/octet-stream"
    };

    Ok(format!(
        "data:{};base64,{}",
        mime,
        general_purpose::STANDARD.encode(bytes)
    ))
}

#[tauri::command]
async fn start_playtime_tracking(
    app_handle: tauri::AppHandle,
    process_manager: State<'_, ProcessManager>,
    appid: String,
    exe_path: String,
) -> Result<(), String> {
    println!(
        "Starting playtime tracking for {} with exe: {}",
        appid, exe_path
    );

    // Load existing playtime from store
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
    let existing_playtime = load_playtime(&playtime_file, &appid).await.unwrap_or(0);

    // Check if process is already running
    {
        let processes = process_manager.processes.lock().unwrap();
        if let Some(info) = processes.get(&appid) {
            if info.is_running {
                return Err("Process is already running for this app".to_string());
            }
        }
    }

    // Extract process name from exe path for monitoring
    let process_name = std::path::Path::new(&exe_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string();

    // Start the game process with elevation handling
    let child = try_spawn_with_elevation(&exe_path)?;
    let _child_id = child.id();

    // Store process info
    {
        let mut processes = process_manager.processes.lock().unwrap();
        processes.insert(
            appid.clone(),
            ProcessInfo {
                start_time: Instant::now(),
                accumulated_time: existing_playtime,
                is_running: true,
            },
        );
    }

    // Monitor the process in a separate thread using process name monitoring
    let appid_clone = appid.clone();
    let processes_arc = Arc::clone(&process_manager.processes);
    let app_handle_clone = app_handle.clone();
    let process_name_clone = process_name.clone();

    thread::spawn(move || {
        // Wait a bit for the process to start
        thread::sleep(Duration::from_secs(2));

        // Monitor by checking if process with this name exists
        loop {
            if !is_process_running(&process_name_clone) {
                break;
            }
            thread::sleep(Duration::from_secs(5)); // Check every 5 seconds
        }

        println!("Process {} is no longer running", process_name_clone);

        // Process has ended, update playtime
        let final_playtime = {
            let mut processes = processes_arc.lock().unwrap();
            if let Some(info) = processes.get_mut(&appid_clone) {
                let session_time = info.start_time.elapsed().as_secs();
                info.accumulated_time += session_time;
                info.is_running = false;
                info.accumulated_time
            } else {
                0
            }
        };

        // Save playtime to file
        tokio::spawn(async move {
            let app_data_dir = app_handle_clone.path().app_data_dir().unwrap();
            let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
            if let Err(e) = save_playtime(&playtime_file, &appid_clone, final_playtime).await {
                println!("Failed to save playtime: {}", e);
            }
        });
    });

    Ok(())
}

#[tauri::command]
async fn get_current_playtime(
    process_manager: State<'_, ProcessManager>,
    appid: String,
) -> Result<u64, String> {
    let processes = process_manager.processes.lock().unwrap();
    if let Some(info) = processes.get(&appid) {
        if info.is_running {
            let session_time = info.start_time.elapsed().as_secs();
            Ok(info.accumulated_time + session_time)
        } else {
            Ok(info.accumulated_time)
        }
    } else {
        Ok(0)
    }
}

#[tauri::command]
async fn stop_playtime_tracking(
    app_handle: tauri::AppHandle,
    process_manager: State<'_, ProcessManager>,
    appid: String,
) -> Result<u64, String> {
    println!("Stopping playtime tracking for {}", appid);

    let final_playtime = {
        let mut processes = process_manager.processes.lock().unwrap();
        if let Some(info) = processes.get_mut(&appid) {
            if info.is_running {
                let session_time = info.start_time.elapsed().as_secs();
                info.accumulated_time += session_time;
                info.is_running = false;
            }
            info.accumulated_time
        } else {
            return Err("No tracking session found for this app".to_string());
        }
    };

    // Save playtime to file
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let playtime_file = app_data_dir.join("Playtime").join("playtimes.json");
    save_playtime(&playtime_file, &appid, final_playtime).await?;

    Ok(final_playtime)
}

async fn load_playtime(file_path: &PathBuf, appid: &str) -> Result<u64, String> {
    if !file_path.exists() {
        return Ok(0);
    }

    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read playtime file: {}", e))?;

    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse playtime JSON: {}", e))?;

    if let Some(playtime) = json.get(appid).and_then(|v| v.as_u64()) {
        Ok(playtime)
    } else {
        Ok(0)
    }
}

async fn save_playtime(file_path: &PathBuf, appid: &str, playtime: u64) -> Result<(), String> {
    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Load existing data or create new
    let mut data = if file_path.exists() {
        let content = std::fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read existing playtime file: {}", e))?;
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // Update the playtime for this appid
    data[appid] = serde_json::Value::Number(serde_json::Number::from(playtime));

    // Write back to file
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize playtime data: {}", e))?;

    std::fs::write(file_path, content)
        .map_err(|e| format!("Failed to write playtime file: {}", e))?;

    Ok(())
}

fn try_spawn_process(exe_path: &str) -> Result<std::process::Child, String> {
    let mut cmd = StdCommand::new(exe_path);
    cmd.stdout(Stdio::null()).stderr(Stdio::null());

    cmd.spawn()
        .map_err(|e| format!("Failed to start process: {}", e))
}

fn try_spawn_with_elevation(exe_path: &str) -> Result<std::process::Child, String> {
    // First try normal execution
    match try_spawn_process(exe_path) {
        Ok(child) => Ok(child),
        Err(e) => {
            // If it fails with elevation error, try with UAC prompt
            if e.contains("740") {
                println!("Process requires elevation, attempting to start with UAC prompt...");
                try_spawn_elevated(exe_path)
            } else {
                Err(e)
            }
        }
    }
}

#[cfg(windows)]
fn is_process_running(process_name: &str) -> bool {
    let output = std::process::Command::new("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {}", process_name)])
        .output();

    match output {
        Ok(output) => {
            let output_str = String::from_utf8_lossy(&output.stdout);
            output_str.contains(process_name)
        }
        Err(_) => false,
    }
}

#[cfg(not(windows))]
fn is_process_running(process_name: &str) -> bool {
    let output = std::process::Command::new("pgrep")
        .arg(process_name)
        .output();

    match output {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

#[cfg(windows)]
fn try_spawn_elevated(exe_path: &str) -> Result<std::process::Child, String> {
    // Use Windows ShellExecute with "runas" verb for UAC elevation
    let mut cmd = StdCommand::new("powershell");
    cmd.args([
        "-WindowStyle",
        "Hidden",
        "-Command",
        &format!("Start-Process -FilePath '{}' -Verb RunAs -Wait", exe_path),
    ]);
    cmd.stdout(Stdio::null()).stderr(Stdio::null());

    // Start powershell process that will handle the elevation
    cmd.spawn()
        .map_err(|e| format!("Failed to start elevated process: {}", e))
}

#[cfg(not(windows))]
fn try_spawn_elevated(exe_path: &str) -> Result<std::process::Child, String> {
    Err("Elevation not supported on this platform".to_string())
}
//
#[tauri::command]
fn track_files(app_handle: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    // Validate paths first
    let valid_paths: Vec<String> = paths
        .into_iter()
        .filter(|path| {
            let path_obj = Path::new(path);
            if path_obj.exists() {
                true
            } else {
                println!("Warning: Path does not exist, skipping: {}", path);
                false
            }
        })
        .collect();

    if valid_paths.is_empty() {
        return Err("No valid paths provided for tracking".to_string());
    }

    // Spawn a thread to run the watcher so the command returns immediately.
    thread::spawn(move || {
        let (tx, rx) = std_channel();

        // Create the watcher; the closure sends events to the channel
        // Use a config that compares contents and polls periodically to reliably catch content-only updates
        let config = NotifyConfig::default()
            .with_compare_contents(true)
            .with_poll_interval(Duration::from_secs(2));

        let watcher_result: notify::Result<RecommendedWatcher> = RecommendedWatcher::new(
            move |res| {
                // send the result (Event or Error) through the channel
                let _ = tx.send(res);
            },
            config,
        );

        let mut watcher = match watcher_result {
            Ok(w) => w,
            Err(e) => {
                println!("Failed to create file watcher: {:?}", e);
                return;
            }
        };

        // Store previous file contents for diff comparison
        let file_contents = Arc::new(Mutex::new(HashMap::<String, String>::new()));

        // Store last event time for debouncing
        let last_event_time = Arc::new(Mutex::new(HashMap::<String, Instant>::new()));

        // Store active debounce tasks to prevent multiple spawns
        let active_tasks = Arc::new(Mutex::new(HashMap::<String, bool>::new()));

        let debounce_duration = Duration::from_millis(1000); // Increased to 1 second

        // Register all valid paths and read initial content
        for p in valid_paths.iter() {
            let path = Path::new(p);
            if let Err(e) = watcher.watch(path, RecursiveMode::NonRecursive) {
                println!("Failed to watch path {}: {:?}", p, e);
            } else {
                println!("Watching: {}", p);
                // Read initial content - handle all file types (text and binary)
                let initial_content = match std::fs::read_to_string(path) {
                    Ok(content) => {
                        println!("Read text content for {}: {} chars", p, content.len());
                        content
                    }
                    Err(_) => {
                        // If reading as text fails, try reading as binary and convert
                        match std::fs::read(path) {
                            Ok(bytes) => {
                                println!("Read binary content for {}: {} bytes", p, bytes.len());
                                String::from_utf8_lossy(&bytes).to_string()
                            }
                            Err(e) => {
                                println!("Failed to read file {}: {:?}", p, e);
                                String::new()
                            }
                        }
                    }
                };

                let mut contents = file_contents.lock().unwrap();
                contents.insert(p.clone(), initial_content);
            }
        }

        // Receive events and emit to frontend with debouncing
        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    let path = event
                        .paths
                        .get(0)
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();

                    println!(
                        "🔥 FILE EVENT DETECTED: {:?} for path: {}",
                        event.kind, path
                    );

                    // Skip if we already have an active task for this path
                    {
                        let mut tasks = active_tasks.lock().unwrap();
                        if tasks.get(&path).unwrap_or(&false) == &true {
                            println!("Skipping duplicate event for path: {}", path);
                            continue;
                        }
                        tasks.insert(path.clone(), true);
                    }

                    // Update last event time for this path
                    {
                        let mut times = last_event_time.lock().unwrap();
                        times.insert(path.clone(), Instant::now());
                    }

                    // Spawn a task to handle the debounced event
                    let app_handle_clone = app_handle.clone();
                    let path_clone = path.clone();
                    let file_contents_clone = Arc::clone(&file_contents);
                    let last_event_time_clone = Arc::clone(&last_event_time);
                    let active_tasks_clone = Arc::clone(&active_tasks);

                    thread::spawn(move || {
                        // Wait for debounce duration
                        thread::sleep(debounce_duration);

                        // Check if this is still the latest event for this path
                        let should_process = {
                            let times = last_event_time_clone.lock().unwrap();
                            times
                                .get(&path_clone)
                                .map(|&last_time| {
                                    let elapsed = last_time.elapsed();
                                    elapsed >= debounce_duration
                                })
                                .unwrap_or(false)
                        };

                        if should_process {
                            println!("Processing file change for: {}", path_clone);

                            // Read current file content - handle all file types (text and binary)
                            let new_content = match std::fs::read_to_string(&path_clone) {
                                Ok(content) => {
                                    println!("Read text content: {} chars", content.len());
                                    content
                                }
                                Err(_) => {
                                    // If reading as text fails, try reading as binary and convert
                                    match std::fs::read(&path_clone) {
                                        Ok(bytes) => {
                                            println!("Read binary content: {} bytes", bytes.len());
                                            String::from_utf8_lossy(&bytes).to_string()
                                        }
                                        Err(e) => {
                                            println!("Failed to read file {}: {:?}", path_clone, e);
                                            String::new()
                                        }
                                    }
                                }
                            };

                            if !new_content.is_empty() {
                                let old_content = {
                                    let contents = file_contents_clone.lock().unwrap();
                                    contents.get(&path_clone).cloned().unwrap_or_default()
                                };

                                println!(
                                    "Old content length: {}, New content length: {}",
                                    old_content.len(),
                                    new_content.len()
                                );

                                // Only process if content actually changed
                                if old_content != new_content {
                                    // Calculate diff to get added lines
                                    let added_lines = get_added_lines(&old_content, &new_content);

                                    // Update stored content
                                    {
                                        let mut contents = file_contents_clone.lock().unwrap();
                                        contents.insert(path_clone.clone(), new_content.clone());
                                    }

                                    println!(
                                        "File changed: {}, added {} lines",
                                        path_clone,
                                        added_lines.len()
                                    );
                                    println!("Added lines: {:?}", added_lines);

                                    let kind = "FileModified";
                                    let payload = json!({
                                        "path": path_clone,
                                        "kind": kind,
                                        "added_lines": added_lines,
                                        "content": new_content
                                    });

                                    println!("Emitting file-change event...");
                                    // emit to all open windows using emit_all
                                    if let Err(e) = app_handle_clone.emit("file-change", payload) {
                                        println!("Failed to emit file-change: {:?}", e);
                                    } else {
                                        println!("Successfully emitted file-change event!");
                                    }
                                } else {
                                    println!("Content unchanged for: {}", path_clone);
                                }
                            } else {
                                println!("Empty content read for: {}", path_clone);
                            }
                        } else {
                            println!("Skipping processing (not latest event) for: {}", path_clone);
                        }

                        // Mark task as completed
                        {
                            let mut tasks = active_tasks_clone.lock().unwrap();
                            tasks.insert(path_clone, false);
                        }
                    });
                }
                Ok(Err(e)) => {
                    println!("Watcher error: {:?}", e);
                }
                Err(e) => {
                    println!("Watcher channel receive error: {:?}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}

// Helper function to get added lines by comparing old and new content
fn get_added_lines(old_content: &str, new_content: &str) -> Vec<String> {
    let old_lines: Vec<&str> = old_content.lines().collect();
    let new_lines: Vec<&str> = new_content.lines().collect();

    let mut added_lines = Vec::new();

    // Simple diff algorithm - find lines that exist in new but not in old
    for (line_num, new_line) in new_lines.iter().enumerate() {
        let line_number = line_num + 1;

        // Check if this line is new by comparing with old content at same position
        if line_num >= old_lines.len() {
            // Line added at the end
            added_lines.push(format!("Line {}: {}", line_number, new_line));
        } else if old_lines[line_num] != *new_line {
            // Line modified or replaced
            if !old_lines.contains(new_line) {
                added_lines.push(format!("Line {}: {}", line_number, new_line));
            }
        }
    }

    // Also check for completely new lines inserted in the middle
    if new_lines.len() > old_lines.len() {
        let diff_count = new_lines.len() - old_lines.len();
        for i in 0..diff_count {
            let potential_new_line_index = old_lines.len() + i;
            if potential_new_line_index < new_lines.len() {
                let line_number = potential_new_line_index + 1;
                let line_content = new_lines[potential_new_line_index];
                if !old_lines.contains(&line_content) {
                    added_lines.push(format!("Line {}: {}", line_number, line_content));
                }
            }
        }
    }

    added_lines
}

#[tauri::command]
async fn toast_notification(
    app_handle: tauri::AppHandle,
    icon_path: String,
    game_name: String,
    achievement_name: String,
    sound_path: Option<String>,
    hero: Option<String>,
    progress: Option<String>, // Format: "current/max" for Xbox-style progress tracking
    is_rare: Option<bool>,    // Mark rare achievements for special styling
) -> Result<(), String> {
    use tauri_winrt_notification::{Duration, IconCrop, Toast};

    // Handle custom sound from public directory first (before creating toast)
    if let Some(sound_filename) = sound_path {
        if !sound_filename.is_empty() {
            // Get the resource directory (where public files are located)
            match app_handle
                .path()
                .resolve(&sound_filename, tauri::path::BaseDirectory::Resource)
            {
                Ok(sound_file_path) => {
                    println!("Looking for sound file at: {:?}", sound_file_path);

                    if sound_file_path.exists() {
                        println!("Sound file found: {:?}", sound_file_path);
                        // Play the custom sound using Windows API
                        play_custom_sound(&sound_file_path).await;
                    } else {
                        println!(
                            "Sound file not found at: {:?}, using default sound",
                            sound_file_path
                        );
                    }
                }
                Err(e) => {
                    println!(
                        "Failed to resolve sound file path: {}, using default sound",
                        e
                    );
                }
            }
        }
    }

    // Process hero image if provided (blur and darken)
    let processed_hero_path = if let Some(hero_path) = hero {
        if !hero_path.is_empty() && std::path::Path::new(&hero_path).exists() {
            match process_hero_image(&hero_path, &app_handle).await {
                Ok(path) => Some(path),
                Err(e) => {
                    println!("Failed to process hero image: {}", e);
                    None
                }
            }
        } else {
            println!("Hero image path invalid or doesn't exist: {}", hero_path);
            None
        }
    } else {
        None
    };

    // Process icon if provided
    let processed_icon_path = if !icon_path.is_empty() && std::path::Path::new(&icon_path).exists()
    {
        match process_icon_image(&icon_path, &app_handle).await {
            Ok(processed_path) => {
                println!(
                    "Successfully processed icon to 120x120: {:?}",
                    processed_path
                );
                Some(processed_path)
            }
            Err(e) => {
                println!("Failed to process icon, using original: {}", e);
                Some(std::path::PathBuf::from(&icon_path))
            }
        }
    } else {
        None
    };

    // Now create the toast notification with Xbox Game Bar styling
    // Use Xbox Game Bar App ID for gaming-style notifications (Achievement Watcher style)
    let xbox_app_id = "Microsoft.XboxGamingOverlay_8wekyb3d8bbwe!App";
    println!("Using Xbox Game Bar App ID for gaming toast: {}", xbox_app_id);

    // Format description based on achievement rarity (Xbox style)
    let description = if is_rare.unwrap_or(false) {
        format!("💎 Rare Achievement Unlocked - {}", achievement_name)
    } else {
        format!("🏆 Achievement Unlocked - {}", achievement_name)
    };

    // Format achievement description with progress if provided
    let achievement_text = if let Some(prog) = &progress {
        if !prog.is_empty() {
            // Parse progress like "current/max"
            if let Some((current, max)) = prog.split_once('/') {
                if let (Ok(curr), Ok(total)) = (current.parse::<u32>(), max.parse::<u32>()) {
                    let percent = (curr as f32 / total as f32 * 100.0) as u32;
                    format!("{}\n📊 Progress: {}% ({}/{})", description, percent, curr, total)
                } else {
                    format!("{}\n📊 {}", description, prog)
                }
            } else {
                format!("{}\n📊 {}", description, prog)
            }
        } else {
            description
        }
    } else {
        description
    };

    let mut toast = Toast::new(xbox_app_id)
        .title(&game_name) // Use game name as the title
        .text1(&achievement_text) // Use formatted description as text1
        .duration(Duration::Long) // Use Long duration for better visibility
        .sound(None); // Sound disabled

    // Add hero image if processed successfully (Xbox-style background)
    if let Some(hero_path) = processed_hero_path {
        println!("Adding Xbox-style hero image: {:?}", hero_path);
        toast = toast.hero(&hero_path, "Game Hero Image");
    }

    // Add icon if processed successfully (Xbox-style achievement icon)
    if let Some(icon_path_buf) = processed_icon_path {
        println!("Adding Xbox-style achievement icon: {:?}", icon_path_buf);
        toast = toast.icon(&icon_path_buf, IconCrop::Square, "Achievement Icon");
    }

    // Show the Xbox-style toast notification
    toast
        .show()
        .map_err(|e| format!("Failed to show Xbox-style toast notification: {}", e))?;

    println!(
        "🎮 Xbox-style toast notification shown for achievement: {} in game: {}{}",
        achievement_name, 
        game_name,
        if is_rare.unwrap_or(false) { " (RARE!)" } else { "" }
    );
    Ok(())
}

// Helper function to process icon image to 120x120 pixels using native Rust
async fn process_icon_image(
    icon_path: &str,
    app_handle: &tauri::AppHandle,
) -> Result<std::path::PathBuf, String> {
    println!("🔍 ICON PROCESSING (Native Rust):");
    println!("Input icon path: {}", icon_path);
    println!(
        "Icon file exists: {}",
        std::path::Path::new(icon_path).exists()
    );

    // Get temp directory for processed icon
    let temp_dir = app_handle
        .path()
        .temp_dir()
        .map_err(|e| format!("Failed to get temp directory: {}", e))?;

    println!("Temp directory: {:?}", temp_dir);

    let input_path = std::path::Path::new(icon_path);
    let file_name = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("achievement_icon");

    let output_path = temp_dir.join(format!("icon_120x120_{}.png", file_name));
    println!("Output path will be: {:?}", output_path);

    // Use the `image` crate for native Rust image processing
    match image::open(icon_path) {
        Ok(img) => {
            println!("✅ Image loaded successfully");
            println!("Original dimensions: {}x{}", img.width(), img.height());

            // Resize to exactly 120x120 pixels
            let resized = img.resize_exact(120, 120, image::imageops::FilterType::Lanczos3);
            println!("Resized to: {}x{}", resized.width(), resized.height());

            // Save as PNG
            match resized.save_with_format(&output_path, image::ImageFormat::Png) {
                Ok(_) => {
                    println!("✅ Successfully saved processed icon to: {:?}", output_path);

                    if output_path.exists() {
                        let metadata = std::fs::metadata(&output_path)
                            .map_err(|e| format!("Failed to get output file metadata: {}", e))?;
                        println!("Output file size: {} bytes", metadata.len());
                        Ok(output_path)
                    } else {
                        Err("Output file was not created".to_string())
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to save resized image: {}", e);
                    println!("❌ {}", error_msg);
                    Err(error_msg)
                }
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to open/decode image: {}", e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

// Helper function to process hero image (blur and darken) using native Rust
async fn process_hero_image(
    hero_path: &str,
    app_handle: &tauri::AppHandle,
) -> Result<std::path::PathBuf, String> {
    println!("🔍 HERO IMAGE PROCESSING (Native Rust):");
    println!("Input hero path: {}", hero_path);

    // Get temp directory for processed image
    let temp_dir = app_handle
        .path()
        .temp_dir()
        .map_err(|e| format!("Failed to get temp directory: {}", e))?;

    let input_path = std::path::Path::new(hero_path);
    let file_name = input_path
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("hero_image");

    let output_path = temp_dir.join(format!("processed_hero_{}.png", file_name));
    println!("Output path will be: {:?}", output_path);

    // Use the `image` crate for native Rust image processing
    match image::open(hero_path) {
        Ok(mut img) => {
            println!("✅ Hero image loaded successfully");
            println!("Original dimensions: {}x{}", img.width(), img.height());

            // Apply blur effect (simple box blur approximation)
            img = img.blur(3.0);

            // Darken the image by reducing brightness
            img = img.brighten(-50); // Darken by reducing brightness

            // Save as PNG
            match img.save_with_format(&output_path, image::ImageFormat::Png) {
                Ok(_) => {
                    println!("✅ Successfully processed hero image to: {:?}", output_path);
                    Ok(output_path)
                }
                Err(e) => {
                    let error_msg = format!("Failed to save processed hero image: {}", e);
                    println!("❌ {}", error_msg);
                    // Fallback: just copy the original
                    std::fs::copy(hero_path, &output_path)
                        .map_err(|e| format!("Failed to copy original hero image: {}", e))?;
                    println!("📄 Used original hero image as fallback");
                    Ok(output_path)
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to process hero image: {}", e);
            // Fallback: just copy the original
            std::fs::copy(hero_path, &output_path)
                .map_err(|e| format!("Failed to copy original hero image: {}", e))?;
            println!("📄 Used original hero image as fallback");
            Ok(output_path)
        }
    }
}

// Helper function to play custom sound using Windows API
#[cfg(windows)]
async fn play_custom_sound(sound_path: &std::path::Path) {
    use std::os::windows::ffi::OsStrExt;

    // Convert path to wide string for Windows API
    let wide_path: Vec<u16> = sound_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    // Spawn a thread to play the sound asynchronously
    let wide_path_clone = wide_path.clone();
    tokio::spawn(async move {
        unsafe {
            // Use Windows PlaySoundW API to play the custom sound
            #[link(name = "winmm")]
            extern "system" {
                fn PlaySoundW(
                    psz_sound: *const u16,
                    hmod: *const std::ffi::c_void,
                    fd_sound: u32,
                ) -> i32;
            }

            const SND_FILENAME: u32 = 0x00020000;
            const SND_ASYNC: u32 = 0x00000001;
            const SND_NODEFAULT: u32 = 0x00000002;

            let result = PlaySoundW(
                wide_path_clone.as_ptr(),
                std::ptr::null(),
                SND_FILENAME | SND_ASYNC | SND_NODEFAULT,
            );

            if result == 0 {
                println!("Failed to play custom sound");
            } else {
                println!("Custom sound played successfully");
            }
        }
    });
}

#[cfg(not(windows))]
async fn play_custom_sound(_sound_path: &std::path::Path) {
    println!("Custom sound playback not supported on this platform");
}

#[tauri::command]
fn show_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
//how long to beat
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct SearchParam {
    #[serde(rename = "searchType")]
    search_type: String,
    #[serde(rename = "searchTerms")]
    search_terms: Vec<String>,
    #[serde(rename = "searchPage")]
    search_page: i32,
    size: i32,
    #[serde(rename = "searchOptions")]
    search_options: SearchOptions,
    #[serde(rename = "useCache")]
    use_cache: bool,
}

#[derive(Debug, Serialize)]
struct SearchOptions {
    games: Games,
    users: SortCategoryContainer,
    lists: SortCategoryContainer,
    filter: String,
    sort: i32,
    randomizer: i32,
}

#[derive(Debug, Serialize)]
struct Games {
    #[serde(rename = "userId")]
    user_id: i32,
    platform: String,
    #[serde(rename = "sortCategory")]
    sort_category: String,
    #[serde(rename = "rangeCategory")]
    range_category: String,
    #[serde(rename = "rangeTime")]
    range_time: RangeTime,
    gameplay: Gameplay,
    #[serde(rename = "rangeYear")]
    range_year: RangeYear,
    modifier: String,
}

#[derive(Debug, Serialize)]
struct RangeTime {
    min: i32,
    max: i32,
}

#[derive(Debug, Serialize)]
struct RangeYear {
    min: String,
    max: String,
}

#[derive(Debug, Serialize)]
struct Gameplay {
    perspective: String,
    flow: String,
    genre: String,
    difficulty: String,
}

#[derive(Debug, Serialize)]
struct SortCategoryContainer {
    #[serde(rename = "sortCategory")]
    sort_category: String,
}

#[derive(Debug, Deserialize)]
struct SearchResult {
    color: Option<String>,
    title: Option<String>,
    category: Option<String>,
    count: Option<i32>,
    #[serde(rename = "pageCurrent")]
    page_current: Option<i32>,
    #[serde(rename = "pageTotal")]
    page_total: Option<i32>,
    #[serde(rename = "pageSize")]
    page_size: Option<i32>,
    data: Option<Vec<GameData>>,
    #[serde(rename = "userData")]
    user_data: Option<serde_json::Value>,
    #[serde(rename = "displayModifier")]
    display_modifier: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct GameData {
    #[serde(rename = "game_id")]
    game_id: i32,
    #[serde(rename = "game_name")]
    game_name: String,
    #[serde(rename = "game_name_date")]
    game_name_date: Option<i32>,
    #[serde(rename = "game_alias")]
    game_alias: Option<String>,
    #[serde(rename = "game_type")]
    game_type: Option<String>,
    #[serde(rename = "game_image")]
    game_image: Option<String>,
    #[serde(rename = "comp_main")]
    comp_main: Option<i32>,
    #[serde(rename = "comp_plus")]
    comp_plus: Option<i32>,
    #[serde(rename = "comp_100")]
    comp_100: Option<i32>,
    #[serde(rename = "comp_all")]
    comp_all: Option<i32>,
    #[serde(rename = "comp_main_count")]
    comp_main_count: Option<i32>,
    #[serde(rename = "comp_plus_count")]
    comp_plus_count: Option<i32>,
    #[serde(rename = "comp_100_count")]
    comp_100_count: Option<i32>,
    #[serde(rename = "comp_all_count")]
    comp_all_count: Option<i32>,
    #[serde(rename = "invested_co")]
    invested_co: Option<i32>,
    #[serde(rename = "invested_mp")]
    invested_mp: Option<i32>,
    #[serde(rename = "profile_platform")]
    profile_platform: Option<String>,
    #[serde(rename = "profile_dev")]
    profile_dev: Option<String>,
    #[serde(rename = "profile_popular")]
    profile_popular: Option<i32>,
    #[serde(rename = "review_score")]
    review_score: Option<i32>,
    #[serde(rename = "release_world")]
    release_world: Option<i32>,
}

async fn get_search_id() -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // First, get the main page to find the search ID
    let base_url = "https://howlongtobeat.com";
    let response = client
        .get(base_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch main page: {}", e))?;
    
    let html = response.text().await
        .map_err(|e| format!("Failed to read main page: {}", e))?;
    
    // Extract the JS file name using regex
    let js_regex = regex::Regex::new(r"_app-\w*\.js").unwrap();
    if let Some(js_match) = js_regex.find(&html) {
        let js_file = js_match.as_str();
        
        // Fetch the JS file to extract search ID
        let js_url = format!("{}/_next/static/chunks/pages/{}", base_url, js_file);
        let js_response = client
            .get(&js_url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch JS file: {}", e))?;
        
        let js_content = js_response.text().await
            .map_err(|e| format!("Failed to read JS file: {}", e))?;
        
        // Extract search ID using regex
        let search_regex = regex::Regex::new(r#""/api/seek/"\.concat\("(\w*?)"\)\.concat\("(\w*?)"\)"#).unwrap();
        if let Some(captures) = search_regex.captures(&js_content) {
            let search_id = format!("{}{}", &captures[1], &captures[2]);
            Ok(search_id)
        } else {
            Err("Could not find search ID in JS file".to_string())
        }
    } else {
        Err("Could not find JS file in main page".to_string())
    }
}

#[tauri::command]
async fn get_how_long_to_beat(game_name: String) -> Result<serde_json::Value, String> {
    println!("====================================");
    println!("Searching for game: {}", game_name);

    let client = reqwest::Client::new();
    
    // Get the dynamic search ID
    let search_id = get_search_id().await?;
    println!("Using search ID: {}", search_id);
    
    // Create search payload matching the plugin's structure
    let search_param = SearchParam {
        search_type: "games".to_string(),
        search_terms: game_name.split_whitespace().map(|s| s.to_string()).collect(),
        search_page: 1,
        size: 20,
        search_options: SearchOptions {
            games: Games {
                user_id: 0,
                platform: "".to_string(),
                sort_category: "popular".to_string(),
                range_category: "main".to_string(),
                range_time: RangeTime { min: 0, max: 0 },
                gameplay: Gameplay {
                    perspective: "".to_string(),
                    flow: "".to_string(),
                    genre: "".to_string(),
                    difficulty: "".to_string(),
                },
                range_year: RangeYear {
                    min: "".to_string(),
                    max: "".to_string(),
                },
                modifier: "".to_string(),
            },
            users: SortCategoryContainer {
                sort_category: "postcount".to_string(),
            },
            lists: SortCategoryContainer {
                sort_category: "follows".to_string(),
            },
            filter: "".to_string(),
            sort: 0,
            randomizer: 0,
        },
        use_cache: true,
    };

    // Make the API request
    let url = format!("https://howlongtobeat.com/api/seek/{}", search_id);
    println!("Sending POST request to: {}", url);

    // Add a delay as suggested in the original code
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .header("Origin", "https://howlongtobeat.com")
        .header("Referer", "https://howlongtobeat.com")
        .json(&search_param)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    println!("HTTP Status: {}", status);

    if !status.is_success() {
        return Err(format!(
            "HTTP error: {} - {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        ));
    }

    // Parse the response
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    println!("Response received, length: {} characters", response_text.len());

    let search_result: SearchResult = serde_json::from_str(&response_text)
        .map_err(|e| format!("JSON parsing error: {} - Response: {}", e, &response_text[..response_text.len().min(500)]))?;

    // Transform the data to match your frontend expectations
    if let Some(data) = search_result.data {
        println!("Found {} game results", data.len());
        
        // Transform to a more convenient format
        let games: Vec<serde_json::Value> = data.into_iter().map(|game| {
            json!({
                "game_id": game.game_id,
                "game_name": game.game_name,
                "game_image": game.game_image.unwrap_or_default(),
                "game_type": game.game_type.unwrap_or_default(),
                "comp_main": game.comp_main.unwrap_or(0),
                "comp_plus": game.comp_plus.unwrap_or(0),
                "comp_100": game.comp_100.unwrap_or(0),
                "comp_all": game.comp_all.unwrap_or(0),
                "comp_main_count": game.comp_main_count.unwrap_or(0),
                "comp_plus_count": game.comp_plus_count.unwrap_or(0),
                "comp_100_count": game.comp_100_count.unwrap_or(0),
                "comp_all_count": game.comp_all_count.unwrap_or(0),
                "profile_platform": game.profile_platform.unwrap_or_default(),
                "profile_dev": game.profile_dev.unwrap_or_default(),
                "review_score": game.review_score.unwrap_or(0),
                "release_world": game.release_world.unwrap_or(0)
            })
        }).collect();
        
        Ok(serde_json::Value::Array(games))
    } else {
        println!("No data field found in response");
        Ok(serde_json::Value::Array(vec![]))
    }
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ProcessManager::new())
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            
            // Create tray menu
            let show_item = MenuItem::with_id(app, "show", "Show UnlockIt", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide UnlockIt", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;
            
            // Build tray icon
            let _tray = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = if window.is_visible().unwrap_or(false) {
                                window.hide()
                            } else {
                                window.show().and_then(|_| window.set_focus())
                            };
                        }
                    }
                })
                .build(app)?;
            
            // Handle window close event to hide instead of exit
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            // Prevent the window from closing
                            api.prevent_close();
                            
                            // Hide the window instead
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        _ => {}
                    }
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_achievements,
            store_achievements_by_appid,
            fetch_game_metadata_from_steam,
            load_image,
            start_playtime_tracking,
            get_current_playtime,
            stop_playtime_tracking,
            track_files,
            toast_notification,
            show_window,
            hide_window,
            get_how_long_to_beat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
