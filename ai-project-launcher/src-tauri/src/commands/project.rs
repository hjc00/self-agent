use crate::models::project::Project;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-project-launcher")
        .join("config.json")
}

fn ensure_config_dir() -> std::io::Result<()> {
    let config_path = get_config_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub window_x: i32,
    pub window_y: i32,
    pub projects: Vec<Project>,
}

impl AppConfig {
    fn load() -> Self {
        let path = get_config_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str(&content) {
                    return config;
                }
            }
        }
        Self::default()
    }

    fn save(&self) -> std::io::Result<()> {
        ensure_config_dir()?;
        let path = get_config_path();
        let content = serde_json::to_string_pretty(self).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })?;
        fs::write(path, content)
    }
}

#[tauri::command]
pub fn list_projects() -> Vec<Project> {
    let config = AppConfig::load();
    config.projects
}

#[tauri::command]
pub fn add_project(name: String, path: String) -> Result<Project, String> {
    if name.trim().is_empty() {
        return Err("Project name cannot be empty".to_string());
    }
    if path.trim().is_empty() {
        return Err("Project path cannot be empty".to_string());
    }

    let mut config = AppConfig::load();

    let project = Project {
        id: uuid_simple(),
        name,
        path,
        created_at: chrono_timestamp(),
        last_used: None,
    };

    config.projects.push(project.clone());
    config.save().map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(id: String) -> Result<(), String> {
    let mut config = AppConfig::load();
    config.projects.retain(|p| p.id != id);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:x}-{:x}", duration.as_secs(), duration.subsec_nanos())
}

fn chrono_timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
