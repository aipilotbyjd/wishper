use crate::hotkey::{register_hotkey, unregister_hotkeys, is_hotkey_available};
use tauri::AppHandle;

#[tauri::command]
pub fn set_global_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    register_hotkey(&app, &hotkey)
}

#[tauri::command]
pub fn clear_global_hotkey(app: AppHandle) -> Result<(), String> {
    unregister_hotkeys(&app)
}

#[tauri::command]
pub fn check_hotkey_available(app: AppHandle, hotkey: String) -> Result<bool, String> {
    is_hotkey_available(&app, &hotkey)
}
