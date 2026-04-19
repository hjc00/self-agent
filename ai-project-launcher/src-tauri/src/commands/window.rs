use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-project-launcher")
        .join("config.json")
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WindowConfig {
    window_x: i32,
    window_y: i32,
}

#[tauri::command]
pub fn save_window_position(x: i32, y: i32) -> Result<(), String> {
    let config_path = get_config_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut config: WindowConfig = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(WindowConfig { window_x: x, window_y: y })
    } else {
        WindowConfig { window_x: x, window_y: y }
    };

    config.window_x = x;
    config.window_y = y;

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn load_window_position() -> Result<(i32, i32), String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok((-1, -1));
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: WindowConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok((config.window_x, config.window_y))
}
