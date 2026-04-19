#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;

use commands::{launcher, project, window};
use tauri::{Emitter, Manager, WindowEvent};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            project::list_projects,
            project::add_project,
            project::delete_project,
            launcher::launch_project,
            window::save_window_position,
            window::load_window_position,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                if let Ok(pos) = window.outer_position() {
                    let _ = window.emit("save-position", (pos.x, pos.y));
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
