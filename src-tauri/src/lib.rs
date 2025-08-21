// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
#[tauri::command]
async fn fetch_achievements(api_key: String, appid: String) -> Result<serde_json::Value, String> {
    // Use GetSchemaForGame instead of GetPlayerAchievements since we don't have a steam_id
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid={}&key={}",
        appid, api_key,
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
    let mut app_data = if let Some(app_data) = json.get(&appId).and_then(|v| v.get("data")) {
        app_data.clone()
    } else {
        serde_json::Value::Null
    };

    Ok(app_data)
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_achievements,
            store_achievements_by_appid,
            fetch_game_metadata_from_steam
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
