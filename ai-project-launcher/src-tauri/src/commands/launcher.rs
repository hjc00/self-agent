use std::process::Command;

#[tauri::command]
pub fn launch_project(path: String, name: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Project path cannot be empty".to_string());
    }

    let project_path = if path.contains(':') {
        path.clone()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(&path)
            .to_string_lossy()
            .to_string()
    };

    let script = format!(
        "cd /d \"{}\" && start cmd /k \"claude\"",
        project_path
    );

    Command::new("cmd")
        .args(["/C", &script])
        .spawn()
        .map_err(|e| format!("Failed to launch project: {}", e))?;

    Ok(())
}
