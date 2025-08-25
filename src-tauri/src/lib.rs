// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command as StdCommand, Stdio};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
use std::sync::mpsc::channel as std_channel;
use std::path::Path;
use serde_json::json;
// notify crate is used to watch filesystem events
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};

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
        appid, api_key,"english"
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
async fn fetch_game_metadata_from_steam(appId: String) -> Result<serde_json::Value, String> {
    // 1. Fetch from Steam
    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}",
        appId
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
    let app_data = if let Some(app_data) = json.get(&appId).and_then(|v| v.get("data")) {
        app_data.clone()
    } else {
        serde_json::Value::Null
    };

    Ok(app_data)
}
#[tauri::command]
fn load_image(path: String) -> Result<String, String> {
    use std::fs;
    use base64::{engine::general_purpose, Engine};

    let bytes = fs::read(&path).map_err(|e| e.to_string())?;

    // Guess MIME type from extension
    let mime = if let Some(ext) = std::path::Path::new(&path).extension().and_then(|e| e.to_str()) {
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

    Ok(format!("data:{};base64,{}", mime, general_purpose::STANDARD.encode(bytes)))
}

#[tauri::command]
async fn start_playtime_tracking(
    app_handle: tauri::AppHandle,
    process_manager: State<'_, ProcessManager>,
    appid: String,
    exe_path: String,
) -> Result<(), String> {
    println!("Starting playtime tracking for {} with exe: {}", appid, exe_path);
    
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
        processes.insert(appid.clone(), ProcessInfo {
            start_time: Instant::now(),
            accumulated_time: existing_playtime,
            is_running: true,
        });
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
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
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
    cmd.stdout(Stdio::null())
       .stderr(Stdio::null());
    
    cmd.spawn().map_err(|e| format!("Failed to start process: {}", e))
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
        Err(_) => false
    }
}

#[cfg(not(windows))]
fn is_process_running(process_name: &str) -> bool {
    let output = std::process::Command::new("pgrep")
        .arg(process_name)
        .output();
    
    match output {
        Ok(output) => output.status.success(),
        Err(_) => false
    }
}

#[cfg(windows)]
fn try_spawn_elevated(exe_path: &str) -> Result<std::process::Child, String> {
    // Use Windows ShellExecute with "runas" verb for UAC elevation
    let mut cmd = StdCommand::new("powershell");
    cmd.args([
        "-WindowStyle", "Hidden",
        "-Command", 
        &format!("Start-Process -FilePath '{}' -Verb RunAs -Wait", exe_path)
    ]);
    cmd.stdout(Stdio::null())
       .stderr(Stdio::null());
    
    // Start powershell process that will handle the elevation
    cmd.spawn().map_err(|e| format!("Failed to start elevated process: {}", e))
}

#[cfg(not(windows))]
fn try_spawn_elevated(exe_path: &str) -> Result<std::process::Child, String> {
    Err("Elevation not supported on this platform".to_string())
}
//
#[tauri::command]
fn track_files(app_handle: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    // Validate paths first
    let valid_paths: Vec<String> = paths.into_iter()
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
                    
                    println!("🔥 FILE EVENT DETECTED: {:?} for path: {}", event.kind, path);
                    
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
                            times.get(&path_clone)
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
                                
                                println!("Old content length: {}, New content length: {}", old_content.len(), new_content.len());
                                
                                // Only process if content actually changed
                                if old_content != new_content {
                                    // Calculate diff to get added lines
                                    let added_lines = get_added_lines(&old_content, &new_content);
                                    
                                    // Update stored content
                                    {
                                        let mut contents = file_contents_clone.lock().unwrap();
                                        contents.insert(path_clone.clone(), new_content.clone());
                                    }
                                    
                                    println!("File changed: {}, added {} lines", path_clone, added_lines.len());
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
    icon_path: String,
    game_name: String,
    achievement_name: String,
    sound_path: Option<String>,
) -> Result<(), String> {
    use tauri_winrt_notification::{Duration, Sound, Toast, IconCrop};
    
    // Create the toast notification with your app name instead of PowerShell
    let mut toast = Toast::new("UnlockIt")
        .title("Achievement Unlocked! 🏆")
        .text1(&game_name)
        .text2(&achievement_name)
        .duration(Duration::Short);
    
    // Add icon if path is provided and file exists
    if !icon_path.is_empty() && std::path::Path::new(&icon_path).exists() {
        let icon_path_ref = std::path::Path::new(&icon_path);
        toast = toast.icon(icon_path_ref, IconCrop::Square, "Achievement Icon");
    }
    
    // Add sound if path is provided
    if let Some(sound) = sound_path {
        if !sound.is_empty() && std::path::Path::new(&sound).exists() {
            toast = toast.sound(Some(Sound::Default));
        } else {
            toast = toast.sound(Some(Sound::Default));
        }
    } else {
        toast = toast.sound(Some(Sound::Default));
    }
    
    // Show the toast notification
    toast.show().map_err(|e| format!("Failed to show toast notification: {}", e))?;
    
    println!("Toast notification shown for achievement: {} in game: {}", achievement_name, game_name);
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ProcessManager::new())
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
            toast_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
