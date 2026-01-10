use crate::db::{Database, HistoryItem, NewHistoryItem, Settings};
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn db_get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key)
}

#[tauri::command]
pub fn db_set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    db.set_setting(&key, &value)
}

#[tauri::command]
pub fn db_get_all_settings(db: State<Database>) -> Result<HashMap<String, String>, String> {
    db.get_all_settings()
}

#[tauri::command]
pub fn db_load_settings(db: State<Database>) -> Result<Settings, String> {
    db.load_settings()
}

#[tauri::command]
pub fn db_save_settings(db: State<Database>, settings: Settings) -> Result<(), String> {
    db.save_settings(&settings)
}

#[tauri::command]
pub fn db_add_history(db: State<Database>, item: NewHistoryItem) -> Result<i64, String> {
    db.add_history(&item)
}

#[tauri::command]
pub fn db_get_history(
    db: State<Database>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<HistoryItem>, String> {
    db.get_history(limit.unwrap_or(50), offset.unwrap_or(0))
}

#[tauri::command]
pub fn db_get_history_item(db: State<Database>, id: i64) -> Result<Option<HistoryItem>, String> {
    db.get_history_item(id)
}

#[tauri::command]
pub fn db_delete_history(db: State<Database>, id: i64) -> Result<bool, String> {
    db.delete_history(id)
}

#[tauri::command]
pub fn db_clear_history(db: State<Database>) -> Result<i32, String> {
    db.clear_history()
}

#[tauri::command]
pub fn db_search_history(
    db: State<Database>,
    query: String,
    limit: Option<i32>,
) -> Result<Vec<HistoryItem>, String> {
    db.search_history(&query, limit.unwrap_or(20))
}

#[tauri::command]
pub fn db_get_history_count(db: State<Database>) -> Result<i64, String> {
    db.get_history_count()
}
