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
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};

#[tauri::command]
async fn download_and_install_update(url: String) -> Result<String, String> {
    // Download the MSI installer
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    // Get the temp directory
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("UnlockIt_Update.msi");
    
    // Write the file
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read download: {}", e))?;
    
    std::fs::write(&installer_path, bytes)
        .map_err(|e| format!("Failed to save installer: {}", e))?;
    
    // Launch the installer
    #[cfg(target_os = "windows")]
    {
        StdCommand::new("msiexec")
            .arg("/i")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }
    
    Ok(installer_path.to_string_lossy().to_string())
}

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

    println!("Parsed JSON: {:#?}", json);
    Ok(json)
}
#[tauri::command]
async fn store_achievements_by_appid(
    app_handle: tauri::AppHandle,
    app_id: String,
    content: String,
) -> Result<(), String> {
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
async fn fetch_igdb_data(
    client_id: String,
    access_token: String,
    endpoint: String,
    query: String,
) -> Result<serde_json::Value, String> {
    let url = format!("https://api.igdb.com/v4/{}", endpoint);
    println!("Fetching IGDB data from: {}", url);

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Accept", "application/json")
        .body(query)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    println!("IGDB HTTP Status: {}", status);

    if !status.is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err(format!(
            "HTTP error: {} - {}",
            status.as_u16(),
            error_text
        ));
    }

    let response_text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    println!("IGDB Response length: {} bytes", response_text.len());

    let json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("JSON parsing error: {}", e))?;

    Ok(json)
}

#[tauri::command]
async fn fetch_game_metadata_from_steam(app_id: String) -> Result<serde_json::Value, String> {
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
    println!("Starting playtime tracking for {} with exe: {}", appid, exe_path);
    
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let playtime_dir = app_data_dir.join("UnlockIt");
    let playtime_file = playtime_dir.join("playtimes.json");
    
    // Load existing playtime from the correct location
    let existing_playtime = load_playtime(&playtime_file, &appid).await.unwrap_or(0);
    println!("Loaded existing playtime: {} seconds", existing_playtime);
    
    {
        let processes = process_manager.processes.lock().unwrap();
        if let Some(info) = processes.get(&appid) {
            if info.is_running {
                return Err("Process is already being tracked for this app".to_string());
            }
        }
    }
    
    let process_name = std::path::Path::new(&exe_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string();
    
    // Check if process is already running before launching
    let already_running = is_process_running(&process_name);
    
    if !already_running {
        // Only launch if not already running
        match try_spawn_with_elevation(&exe_path) {
            Ok(_child) => {
                println!("Successfully launched process: {}", process_name);
                // Give the process time to start
                thread::sleep(Duration::from_secs(2));
            }
            Err(e) => {
                println!("Failed to launch process: {}", e);
                // Continue tracking anyway in case it was launched externally
            }
        }
    } else {
        println!("Process {} is already running, starting tracking", process_name);
    }
    
    // Start tracking regardless of launch success
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

    let appid_clone = appid.clone();
    let processes_arc = Arc::clone(&process_manager.processes);
    let app_handle_clone = app_handle.clone();
    let process_name_clone = process_name.clone();

    thread::spawn(move || {
        println!("Starting background monitoring for process: {}", process_name_clone);
        
        // Monitor the process
        loop {
            if !is_process_running(&process_name_clone) {
                break;
            }
            thread::sleep(Duration::from_secs(3)); // Check every 3 seconds for better responsiveness
        }

        println!("Process {} is no longer running", process_name_clone);
        let final_playtime = {
            let mut processes = processes_arc.lock().unwrap();
            if let Some(info) = processes.get_mut(&appid_clone) {
                let session_time = info.start_time.elapsed().as_secs();
                info.accumulated_time += session_time;
                info.is_running = false;
                let final_time = info.accumulated_time;
                println!("Final playtime for {}: {} seconds (session: {} seconds)", 
                        appid_clone, final_time, session_time);
                final_time
            } else {
                0
            }
        };
        
        // Save playtime asynchronously
        tokio::spawn(async move {
            let app_data_dir = app_handle_clone.path().app_data_dir().unwrap();
            let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
            if let Err(e) = save_playtime(&playtime_file, &appid_clone, final_playtime).await {
                println!("Failed to save playtime: {}", e);
            } else {
                println!("Successfully saved playtime: {} seconds", final_playtime);
            }
        });
    });

    Ok(())
}

#[tauri::command]
async fn start_process_monitoring(
    app_handle: tauri::AppHandle,
    process_manager: State<'_, ProcessManager>,
    appid: String,
    exe_path: String,
) -> Result<(), String> {
    println!("Starting process monitoring for {} (exe: {})", appid, exe_path);
    
    let process_name = std::path::Path::new(&exe_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string();

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
    let existing_playtime = load_playtime(&playtime_file, &appid).await.unwrap_or(0);
    
    // Check if process is currently running
    if !is_process_running(&process_name) {
        return Err(format!("Process {} is not currently running", process_name));
    }
    
    {
        let mut processes = process_manager.processes.lock().unwrap();
        if processes.contains_key(&appid) {
            return Err("Already monitoring this app".to_string());
        }
        
        processes.insert(
            appid.clone(),
            ProcessInfo {
                start_time: Instant::now(),
                accumulated_time: existing_playtime,
                is_running: true,
            },
        );
    }

    let appid_clone = appid.clone();
    let processes_arc = Arc::clone(&process_manager.processes);
    let app_handle_clone = app_handle.clone();
    let process_name_clone = process_name.clone();

    thread::spawn(move || {
        println!("Starting background monitoring for already running process: {}", process_name_clone);
        
        loop {
            if !is_process_running(&process_name_clone) {
                break;
            }
            thread::sleep(Duration::from_secs(3));
        }

        println!("Process {} is no longer running", process_name_clone);
        let final_playtime = {
            let mut processes = processes_arc.lock().unwrap();
            if let Some(info) = processes.get_mut(&appid_clone) {
                let session_time = info.start_time.elapsed().as_secs();
                info.accumulated_time += session_time;
                info.is_running = false;
                let final_time = info.accumulated_time;
                println!("Final playtime for {}: {} seconds (session: {} seconds)", 
                        appid_clone, final_time, session_time);
                final_time
            } else {
                0
            }
        };
        
        tokio::spawn(async move {
            let app_data_dir = app_handle_clone.path().app_data_dir().unwrap();
            let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
            if let Err(e) = save_playtime(&playtime_file, &appid_clone, final_playtime).await {
                println!("Failed to save playtime: {}", e);
            } else {
                println!("Successfully saved playtime: {} seconds", final_playtime);
            }
        });
    });

    Ok(())
}

#[tauri::command]
async fn check_process_status(
    _process_manager: State<'_, ProcessManager>,
    exe_path: String,
) -> Result<bool, String> {
    let process_name = std::path::Path::new(&exe_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string();
    
    Ok(is_process_running(&process_name))
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
                println!("Session time: {} seconds, Total: {} seconds", session_time, info.accumulated_time);
            }
            info.accumulated_time
        } else {
            return Err("No tracking session found for this app".to_string());
        }
    };
    
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;

    let playtime_file = app_data_dir.join("UnlockIt").join("playtimes.json");
    save_playtime(&playtime_file, &appid, final_playtime).await?;

    Ok(final_playtime)
}

async fn load_playtime(file_path: &PathBuf, appid: &str) -> Result<u64, String> {
    // Try different possible file locations
    let possible_paths = vec![
        file_path.clone(),
        file_path.parent().unwrap_or(file_path).join("playtimes.json"),
    ];
    
    for path in possible_paths {
        if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(content) => {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(playtime) = json.get(appid).and_then(|v| v.as_u64()) {
                            println!("Loaded playtime {} for app {} from {:?}", playtime, appid, path);
                            return Ok(playtime);
                        }
                    }
                }
                Err(e) => {
                    println!("Failed to read playtime file {:?}: {}", path, e);
                }
            }
        }
    }
    
    println!("No existing playtime found for app {}", appid);
    Ok(0)
}

async fn save_playtime(file_path: &PathBuf, appid: &str, playtime: u64) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Ensure we use the correct path structure
    let corrected_path = if file_path.to_string_lossy().contains("Playtime") {
        file_path.clone()
    } else {
        file_path.parent().unwrap_or(file_path).join("playtimes.json")
    };
    
    let mut data = if corrected_path.exists() {
        let content = std::fs::read_to_string(&corrected_path)
            .map_err(|e| format!("Failed to read existing playtime file: {}", e))?;
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    
    data[appid] = serde_json::Value::Number(serde_json::Number::from(playtime));
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize playtime data: {}", e))?;

    std::fs::write(&corrected_path, content)
        .map_err(|e| format!("Failed to write playtime file: {}", e))?;

    println!("Saved playtime {} for app {} to {:?}", playtime, appid, corrected_path);
    Ok(())
}

fn try_spawn_process(exe_path: &str) -> Result<std::process::Child, String> {
    let mut cmd = StdCommand::new(exe_path);
    cmd.stdout(Stdio::null()).stderr(Stdio::null());

    cmd.spawn()
        .map_err(|e| format!("Failed to start process: {}", e))
}

fn try_spawn_with_elevation(exe_path: &str) -> Result<std::process::Child, String> {
    match try_spawn_process(exe_path) {
        Ok(child) => Ok(child),
        Err(e) => {
            if e.contains("740") {
                println!("Process requires elevation, attempting to start with UAC prompt...");
                try_spawn_elevated(exe_path)
            } else {
                Err(e)
            }
        }
    }
}

fn is_process_running(process_name: &str) -> bool {
    use sysinfo::{System, ProcessesToUpdate};
    
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    
    let target_name = process_name.trim_end_matches(".exe").to_lowercase();
    
    for (_, process) in sys.processes() {
        let proc_name = process.name().to_string_lossy().to_lowercase();
        let proc_name_no_ext = proc_name.trim_end_matches(".exe");
        
        if proc_name == target_name || proc_name_no_ext == target_name {
            return true;
        }
    }
    
    false
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
    let mut cmd = StdCommand::new("powershell");
    cmd.args([
        "-WindowStyle",
        "Hidden",
        "-Command",
        &format!("Start-Process -FilePath '{}' -Verb RunAs -Wait", exe_path),
    ]);
    cmd.stdout(Stdio::null()).stderr(Stdio::null());
    cmd.spawn()
        .map_err(|e| format!("Failed to start elevated process: {}", e))
}

#[cfg(not(windows))]
fn try_spawn_elevated(exe_path: &str) -> Result<std::process::Child, String> {
    Err("Elevation not supported on this platform".to_string())
}
#[tauri::command]
fn track_files(app_handle: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
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
    thread::spawn(move || {
        let (tx, rx) = std_channel();
        let config = NotifyConfig::default()
            .with_compare_contents(true)
            .with_poll_interval(Duration::from_secs(2));

        let watcher_result: notify::Result<RecommendedWatcher> = RecommendedWatcher::new(
            move |res| {
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
        let file_contents = Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let last_event_time = Arc::new(Mutex::new(HashMap::<String, Instant>::new()));
        let active_tasks = Arc::new(Mutex::new(HashMap::<String, bool>::new()));

        let debounce_duration = Duration::from_millis(1000); // Increased to 1 second
        for p in valid_paths.iter() {
            let path = Path::new(p);
            if let Err(e) = watcher.watch(path, RecursiveMode::NonRecursive) {
                println!("Failed to watch path {}: {:?}", p, e);
            } else {
                println!("Watching: {}", p);
                let initial_content = match std::fs::read_to_string(path) {
                    Ok(content) => {
                        println!("Read text content for {}: {} chars", p, content.len());
                        content
                    }
                    Err(_) => {
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
                    {
                        let mut tasks = active_tasks.lock().unwrap();
                        if tasks.get(&path).unwrap_or(&false) == &true {
                            println!("Skipping duplicate event for path: {}", path);
                            continue;
                        }
                        tasks.insert(path.clone(), true);
                    }
                    {
                        let mut times = last_event_time.lock().unwrap();
                        times.insert(path.clone(), Instant::now());
                    }
                    let app_handle_clone = app_handle.clone();
                    let path_clone = path.clone();
                    let file_contents_clone = Arc::clone(&file_contents);
                    let last_event_time_clone = Arc::clone(&last_event_time);
                    let active_tasks_clone = Arc::clone(&active_tasks);

                    thread::spawn(move || {
                        thread::sleep(debounce_duration);
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
                            let new_content = match std::fs::read_to_string(&path_clone) {
                                Ok(content) => {
                                    println!("Read text content: {} chars", content.len());
                                    content
                                }
                                Err(_) => {
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
                                if old_content != new_content {
                                    let added_lines = get_added_lines(&old_content, &new_content);
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
fn get_added_lines(old_content: &str, new_content: &str) -> Vec<String> {
    let old_lines: Vec<&str> = old_content.lines().collect();
    let new_lines: Vec<&str> = new_content.lines().collect();

    let mut added_lines = Vec::new();
    for (line_num, new_line) in new_lines.iter().enumerate() {
        let line_number = line_num + 1;
        if line_num >= old_lines.len() {
            added_lines.push(format!("Line {}: {}", line_number, new_line));
        } else if old_lines[line_num] != *new_line {
            if !old_lines.contains(new_line) {
                added_lines.push(format!("Line {}: {}", line_number, new_line));
            }
        }
    }
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
    if let Some(sound_filename) = sound_path {
        if !sound_filename.is_empty() {
            match app_handle
                .path()
                .resolve(&sound_filename, tauri::path::BaseDirectory::Resource)
            {
                Ok(sound_file_path) => {
                    println!("Looking for sound file at: {:?}", sound_file_path);

                    if sound_file_path.exists() {
                        println!("Sound file found: {:?}", sound_file_path);
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
    let xbox_app_id = "Microsoft.XboxGamingOverlay_8wekyb3d8bbwe!App";
    println!("Using Xbox Game Bar App ID for gaming toast: {}", xbox_app_id);
    let description = if is_rare.unwrap_or(false) {
        format!("💎 Rare Achievement Unlocked - {}", achievement_name)
    } else {
        format!("🏆 Achievement Unlocked - {}", achievement_name)
    };
    let achievement_text = if let Some(prog) = &progress {
        if !prog.is_empty() {
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
        .duration(Duration::Short) 
        .sound(None); // Sound disabled
    if let Some(hero_path) = processed_hero_path {
        println!("Adding Xbox-style hero image: {:?}", hero_path);
        toast = toast.hero(&hero_path, "Game Hero Image");
    }
    if let Some(icon_path_buf) = processed_icon_path {
        println!("Adding Xbox-style achievement icon: {:?}", icon_path_buf);
        toast = toast.icon(&icon_path_buf, IconCrop::Square, "Achievement Icon");
    }
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
    match image::open(icon_path) {
        Ok(img) => {
            println!("✅ Image loaded successfully");
            println!("Original dimensions: {}x{}", img.width(), img.height());
            let resized = img.resize_exact(120, 120, image::imageops::FilterType::Lanczos3);
            println!("Resized to: {}x{}", resized.width(), resized.height());
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
async fn process_hero_image(
    hero_path: &str,
    app_handle: &tauri::AppHandle,
) -> Result<std::path::PathBuf, String> {
    println!("🔍 HERO IMAGE PROCESSING (Native Rust):");
    println!("Input hero path: {}", hero_path);
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
    match image::open(hero_path) {
        Ok(mut img) => {
            println!("✅ Hero image loaded successfully");
            println!("Original dimensions: {}x{}", img.width(), img.height());
            img = img.blur(3.0);
            img = img.brighten(-50); // Darken by reducing brightness
            match img.save_with_format(&output_path, image::ImageFormat::Png) {
                Ok(_) => {
                    println!("✅ Successfully processed hero image to: {:?}", output_path);
                    Ok(output_path)
                }
                Err(e) => {
                    let error_msg = format!("Failed to save processed hero image: {}", e);
                    println!("❌ {}", error_msg);
                    std::fs::copy(hero_path, &output_path)
                        .map_err(|e| format!("Failed to copy original hero image: {}", e))?;
                    println!("📄 Used original hero image as fallback");
                    Ok(output_path)
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to process hero image: {}", e);
            std::fs::copy(hero_path, &output_path)
                .map_err(|e| format!("Failed to copy original hero image: {}", e))?;
            println!("📄 Used original hero image as fallback");
            Ok(output_path)
        }
    }
}
#[cfg(windows)]
async fn play_custom_sound(sound_path: &std::path::Path) {
    use std::os::windows::ffi::OsStrExt;
    let wide_path: Vec<u16> = sound_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let wide_path_clone = wide_path.clone();
    tokio::spawn(async move {
        unsafe {
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
    let base_url = "https://howlongtobeat.com";
    
    // Fetch main page
    let response = client
        .get(base_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch main page: {}", e))?;
    
    let html = response.text().await
        .map_err(|e| format!("Failed to read main page: {}", e))?;
    
    println!("Fetched main page, length: {} bytes", html.len());
    
    // Try multiple patterns to find the JS file
    let patterns = vec![
        r"submit-\w*\.js",           // submit-abc123.js
        r"_app-\w*\.js",             // _app-abc123.js  
        r"pages/submit-[a-f0-9]+\.js", // pages/submit-abc123.js
        r"pages/_app-[a-f0-9]+\.js",   // pages/_app-abc123.js
    ];
    
    let mut js_file = None;
    let mut js_url = String::new();
    
    for pattern in patterns {
        let js_regex = regex::Regex::new(pattern).unwrap();
        if let Some(js_match) = js_regex.find(&html) {
            js_file = Some(js_match.as_str().to_string());
            
            // Construct the URL - if it already contains "pages/", use it as-is
            if js_file.as_ref().unwrap().contains("pages/") {
                js_url = format!("{}/_next/static/chunks/{}", base_url, js_file.as_ref().unwrap());
            } else {
                js_url = format!("{}/_next/static/chunks/pages/{}", base_url, js_file.as_ref().unwrap());
            }
            
            println!("Found JS file using pattern '{}': {}", pattern, js_file.as_ref().unwrap());
            break;
        }
    }
    
    if js_file.is_none() {
        // Try to extract any _next JS file reference
        println!("Standard patterns failed, searching for any _next static JS file...");
        let generic_regex = regex::Regex::new(r#"/_next/static/chunks/pages/[^"']+\.js"#).unwrap();
        if let Some(js_match) = generic_regex.find(&html) {
            js_url = format!("{}{}", base_url, js_match.as_str());
            println!("Found generic JS file: {}", js_url);
        } else {
            return Err("Could not find any suitable JS file in main page".to_string());
        }
    }
    
    // Fetch the JS file
    println!("Fetching JS from: {}", js_url);
    let js_response = client
        .get(&js_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch JS file: {}", e))?;
    
    let js_content = js_response.text().await
        .map_err(|e| format!("Failed to read JS file: {}", e))?;
    
    println!("Fetched JS file, length: {} bytes", js_content.len());
    
    // Try multiple regex patterns to find the search ID
    let search_patterns = vec![
        r#""/api/locate/"\.concat\("(\w+)"\)\.concat\("(\w+)"\)"#,
        r#""/api/seek/"\.concat\("(\w+)"\)\.concat\("(\w+)"\)"#,
        r#"/api/locate/([a-zA-Z0-9]+)([a-zA-Z0-9]+)"#,
        r#"api/locate/","(\w+)","(\w+)"#,
    ];
    
    for pattern in search_patterns {
        let search_regex = regex::Regex::new(pattern).unwrap();
        if let Some(captures) = search_regex.captures(&js_content) {
            if captures.len() >= 3 {
                let search_id = format!("{}{}", &captures[1], &captures[2]);
                println!("Found search ID using pattern '{}': {}", pattern, search_id);
                return Ok(search_id);
            }
        }
    }
    
    Err("Could not find search ID in JS file with any known pattern".to_string())
}

#[tauri::command]
async fn get_how_long_to_beat(game_name: String) -> Result<serde_json::Value, String> {
    println!("====================================");
    println!("Searching for game: {}", game_name);

    let client = reqwest::Client::new();
    let search_id = get_search_id().await?;
    println!("Using search ID: {}", search_id);
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
    // Use /api/locate/ endpoint, not /api/seek/
    let url = format!("https://howlongtobeat.com/api/locate/{}", search_id);
    println!("Sending POST request to: {}", url);
    
    // Add a 2-second delay before making the request (as done in Playnite plugin)
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")
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
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    println!("Response received, length: {} characters", response_text.len());

    let search_result: SearchResult = serde_json::from_str(&response_text)
        .map_err(|e| format!("JSON parsing error: {} - Response: {}", e, &response_text[..response_text.len().min(500)]))?;
    if let Some(data) = search_result.data {
        println!("Found {} game results", data.len());
        let games: Vec<serde_json::Value> = data.into_iter().map(|game| {
            // Debug: print the raw game_image value
            println!("DEBUG - Raw game_image value: {:?}", game.game_image);
            
            // Build the image URL correctly
            let game_image_url = if let Some(ref img) = game.game_image {
                if !img.is_empty() {
                    let url = format!("https://howlongtobeat.com/games/{}", img);
                    println!("DEBUG - Constructed image URL: {}", url);
                    url
                } else {
                    println!("DEBUG - Empty game_image string");
                    String::new()
                }
            } else {
                println!("DEBUG - No game_image value");
                String::new()
            };
            
            json!({
                "game_id": game.game_id,
                "game_name": game.game_name,
                "game_image": game_image_url,
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

#[tauri::command]
async fn fetch_steam_achievement_percentages(appid: String) -> Result<serde_json::Value, String> {
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={}",
        appid
    );

    println!("Fetching Steam achievement percentages from URL: {}", url);

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

    println!("Parsed JSON: {:#?}", json);
    Ok(json)
}

//-------------------------------------

//-------------------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ProcessManager::new())
        .setup(|app| {
            use tauri::tray::TrayIconEvent;
            use tauri::menu::{Menu, MenuItem};
            
            println!("Setting up application with built-in tray...");
            
            // Create tray menu
            let show_item = MenuItem::with_id(app, "show", "Show UnlockIt", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide UnlockIt", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;
            
            // Set up tray icon if it exists (using built-in tray from config)
            if let Some(tray) = app.tray_by_id("main") {
                tray.set_menu(Some(menu))?;
                
                tray.on_menu_event(move |app, event| {
                    println!("Tray menu event: {:?}", event.id);
                    match event.id.as_ref() {
                        "show" => {
                            println!("Show window requested from tray");
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.unminimize();
                            }
                        }
                        "hide" => {
                            println!("Hide window requested from tray");
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            println!("Quit requested from tray");
                            app.exit(0);
                        }
                        _ => {}
                    }
                });
                
                tray.on_tray_icon_event(|tray, event| {
                    println!("Tray icon event: {:?}", event);
                    match event {
                        TrayIconEvent::Click { 
                            button: tauri::tray::MouseButton::Left, 
                            button_state: tauri::tray::MouseButtonState::Up, 
                            .. 
                        } => {
                            println!("Left click on tray icon");
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                match window.is_visible() {
                                    Ok(true) => {
                                        println!("Window is visible, hiding...");
                                        let _ = window.hide();
                                    }
                                    _ => {
                                        println!("Window is hidden, showing...");
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                        let _ = window.unminimize();
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                });
                
                println!("Built-in tray icon configured successfully!");
            } else {
                println!("Warning: No tray icon found with ID 'main'");
            }
            
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
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
            fetch_igdb_data,
            load_image,
            start_playtime_tracking,
            start_process_monitoring,
            check_process_status,
            get_current_playtime,
            stop_playtime_tracking,
            track_files,
            toast_notification,
            show_window,
            hide_window,
            get_how_long_to_beat,
            fetch_steam_achievement_percentages,
            download_and_install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
