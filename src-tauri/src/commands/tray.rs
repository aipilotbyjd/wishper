use crate::tray::{update_tray_state, get_tray_state, TRAY_STATE_IDLE, TRAY_STATE_RECORDING, TRAY_STATE_PROCESSING};
use tauri::AppHandle;

#[tauri::command]
pub fn set_tray_recording(app: AppHandle) -> Result<(), String> {
    update_tray_state(&app, TRAY_STATE_RECORDING)
}

#[tauri::command]
pub fn set_tray_processing(app: AppHandle) -> Result<(), String> {
    update_tray_state(&app, TRAY_STATE_PROCESSING)
}

#[tauri::command]
pub fn set_tray_idle(app: AppHandle) -> Result<(), String> {
    update_tray_state(&app, TRAY_STATE_IDLE)
}

#[tauri::command]
pub fn get_current_tray_state() -> u8 {
    get_tray_state()
}
