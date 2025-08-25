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
    // Spawn a thread to run the watcher so the command returns immediately.
    thread::spawn(move || {
        let (tx, rx) = std_channel();

        // Create the watcher; the closure sends events to the channel
        // Use a config that compares contents and polls periodically to reliably catch content-only updates
        let config = NotifyConfig::default()
            .with_compare_contents(true)
            .with_poll_interval(Duration::from_secs(15));

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

        // Register all paths
        for p in paths.iter() {
            let path = Path::new(p);
            if let Err(e) = watcher.watch(path, RecursiveMode::NonRecursive) {
                println!("Failed to watch path {}: {:?}", p, e);
            } else {
                println!("Watching: {}", p);
            }
        }

        // Receive events and emit to frontend
        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    let path = event
                        .paths
                        .get(0)
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let kind = format!("{:?}", event.kind);
                    let payload = json!({"path": path, "kind": kind});
                    // emit to all open windows using emit_all
                    if let Err(e) = app_handle.emit("file-change", payload) {
                        println!("Failed to emit file-change: {:?}", e);
                    }
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
            stop_playtime_tracking
            , track_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
