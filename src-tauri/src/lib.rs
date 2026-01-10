mod audio;
mod api;
mod commands;
mod hotkey;
mod clipboard;
mod tray;
mod db;

use commands::{
    get_default_microphone, get_microphones, is_recording, start_recording, stop_recording,
    transcribe, polish, transcribe_and_polish,
    set_global_hotkey, clear_global_hotkey, check_hotkey_available,
    paste, copy, get_clipboard,
    set_tray_recording, set_tray_processing, set_tray_idle, get_current_tray_state,
    db_get_setting, db_set_setting, db_get_all_settings, db_load_settings, db_save_settings,
    db_add_history, db_get_history, db_get_history_item, db_delete_history, db_clear_history,
    db_search_history, db_get_history_count,
    db_add_dictionary_word, db_get_dictionary, db_delete_dictionary_word,
    db_get_dictionary_prompt, db_import_dictionary, db_export_dictionary,
    db_add_snippet, db_get_snippets, db_delete_snippet, db_process_snippets,
    RecorderState,
};
use audio::AudioRecorder;
use db::Database;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let db = Database::new(&app.handle())
                .expect("Failed to initialize database");
            app.manage(db);

            tray::create_tray(&app.handle())
                .expect("Failed to create system tray");

            Ok(())
        })
        .manage(RecorderState(Mutex::new(AudioRecorder::new())))
        .invoke_handler(tauri::generate_handler![
            get_microphones,
            get_default_microphone,
            start_recording,
            stop_recording,
            is_recording,
            transcribe,
            polish,
            transcribe_and_polish,
            set_global_hotkey,
            clear_global_hotkey,
            check_hotkey_available,
            paste,
            copy,
            get_clipboard,
            set_tray_recording,
            set_tray_processing,
            set_tray_idle,
            get_current_tray_state,
            db_get_setting,
            db_set_setting,
            db_get_all_settings,
            db_load_settings,
            db_save_settings,
            db_add_history,
            db_get_history,
            db_get_history_item,
            db_delete_history,
            db_clear_history,
            db_search_history,
            db_get_history_count,
            db_add_dictionary_word,
            db_get_dictionary,
            db_delete_dictionary_word,
            db_get_dictionary_prompt,
            db_import_dictionary,
            db_export_dictionary,
            db_add_snippet,
            db_get_snippets,
            db_delete_snippet,
            db_process_snippets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
