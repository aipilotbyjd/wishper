# Phase 4: System Tray & Persistence (Week 4)

> **Duration:** Days 22-28
> **Goal:** Implement system tray menu and SQLite database for persistent storage

---

## Day 22-24: System Tray Implementation

### Step 1: Add Tray Plugin Dependency

**Update `src-tauri/Cargo.toml`:**
```toml
[dependencies]
# ... existing dependencies ...
tauri-plugin-shell = "2"
```

### Step 2: Create Tray Module

**`src-tauri/src/tray.rs`:**
```rust
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};
use std::sync::atomic::{AtomicU8, Ordering};

// Tray icon states
pub const TRAY_STATE_IDLE: u8 = 0;
pub const TRAY_STATE_RECORDING: u8 = 1;
pub const TRAY_STATE_PROCESSING: u8 = 2;

static CURRENT_STATE: AtomicU8 = AtomicU8::new(TRAY_STATE_IDLE);

/// Create the system tray
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let toggle_item = MenuItem::with_id(app, "toggle", "Start Recording", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let history_item = MenuItem::with_id(app, "history", "History", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let about_item = MenuItem::with_id(app, "about", "About VoiceFlow", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit VoiceFlow", true, Some("CmdOrCtrl+Q"))?;

    // Build menu
    let menu = Menu::with_items(
        app,
        &[
            &toggle_item,
            &separator1,
            &settings_item,
            &history_item,
            &separator2,
            &about_item,
            &quit_item,
        ],
    )?;

    // Create tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("VoiceFlow - Click to toggle recording")
        .on_menu_event(move |app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Left click toggles recording
                let _ = tray.app_handle().emit("toggle_recording", ());
            }
        })
        .build(app)?;

    Ok(())
}

/// Handle menu item clicks
fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event_id: &str) {
    match event_id {
        "toggle" => {
            let _ = app.emit("toggle_recording", ());
        }
        "settings" => {
            let _ = app.emit("open_settings", ());
            // Show main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "history" => {
            let _ = app.emit("open_history", ());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "about" => {
            let _ = app.emit("open_about", ());
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

/// Update tray icon based on recording state
pub fn update_tray_state<R: Runtime>(app: &AppHandle<R>, state: u8) -> Result<(), String> {
    CURRENT_STATE.store(state, Ordering::SeqCst);

    // Get tray handle
    let tray = app
        .tray_by_id("main")
        .ok_or("Tray not found")?;

    // Update tooltip based on state
    let tooltip = match state {
        TRAY_STATE_IDLE => "VoiceFlow - Click to start recording",
        TRAY_STATE_RECORDING => "VoiceFlow - Recording... Click to stop",
        TRAY_STATE_PROCESSING => "VoiceFlow - Processing...",
        _ => "VoiceFlow",
    };

    tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;

    // Update menu item text
    if let Some(menu) = tray.menu() {
        // Note: In Tauri 2, you'd need to rebuild the menu or use a different approach
        // This is a simplified version
    }

    Ok(())
}

/// Get current tray state
pub fn get_tray_state() -> u8 {
    CURRENT_STATE.load(Ordering::SeqCst)
}
```

### Step 3: Create Tray Commands

**`src-tauri/src/commands/tray.rs`:**
```rust
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
```

### Step 4: Update Commands Module

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;
pub mod hotkey;
pub mod clipboard;
pub mod tray;

pub use recording::*;
pub use transcription::*;
pub use hotkey::*;
pub use clipboard::*;
pub use tray::*;
```

---

## Day 25-28: SQLite Database Implementation

### Step 1: Create Database Module

**`src-tauri/src/db/mod.rs`:**
```rust
pub mod schema;
pub mod settings;
pub mod history;
pub mod migrations;

pub use schema::Database;
pub use settings::*;
pub use history::*;
```

### Step 2: Define Database Schema

**`src-tauri/src/db/schema.rs`:**
```rust
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Create new database connection
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;

        // Create directory if it doesn't exist
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

        let db_path = app_dir.join("voiceflow.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        // Run migrations
        db.run_migrations()?;

        Ok(db)
    }

    /// Run database migrations
    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Create settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Create history table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_text TEXT NOT NULL,
                polished_text TEXT,
                duration_seconds REAL,
                word_count INTEGER,
                language TEXT DEFAULT 'en',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Create index for faster history queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC)",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Create dictionary table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS dictionary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                pronunciation TEXT,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Create snippets table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_phrase TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                use_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Create usage_stats table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS usage_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL UNIQUE,
                total_dictations INTEGER DEFAULT 0,
                total_words INTEGER DEFAULT 0,
                total_duration_seconds REAL DEFAULT 0
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Insert default settings if they don't exist
        let default_settings = vec![
            ("language", "en"),
            ("hotkey", "CommandOrControl+Shift+Space"),
            ("auto_paste", "true"),
            ("polish_text", "true"),
            ("theme", "system"),
            ("microphone_id", "default"),
            ("show_floating_window", "true"),
        ];

        for (key, value) in default_settings {
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
                [key, value],
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}
```

### Step 3: Implement Settings CRUD

**`src-tauri/src/db/settings.rs`:**
```rust
use super::Database;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub language: String,
    pub hotkey: String,
    pub auto_paste: bool,
    pub polish_text: bool,
    pub theme: String,
    pub microphone_id: String,
    pub show_floating_window: bool,
    pub api_key: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            hotkey: "CommandOrControl+Shift+Space".to_string(),
            auto_paste: true,
            polish_text: true,
            theme: "system".to_string(),
            microphone_id: "default".to_string(),
            show_floating_window: true,
            api_key: None,
        }
    }
}

impl Database {
    /// Get a single setting value
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let result: Result<String, _> = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Set a single setting value
    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO settings (key, value, updated_at) 
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP",
            [key, value],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Get all settings
    pub fn get_all_settings(&self) -> Result<HashMap<String, String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;

        let settings_iter = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let mut settings = HashMap::new();
        for setting in settings_iter {
            let (key, value) = setting.map_err(|e| e.to_string())?;
            settings.insert(key, value);
        }

        Ok(settings)
    }

    /// Save all settings from a Settings struct
    pub fn save_settings(&self, settings: &Settings) -> Result<(), String> {
        self.set_setting("language", &settings.language)?;
        self.set_setting("hotkey", &settings.hotkey)?;
        self.set_setting("auto_paste", &settings.auto_paste.to_string())?;
        self.set_setting("polish_text", &settings.polish_text.to_string())?;
        self.set_setting("theme", &settings.theme)?;
        self.set_setting("microphone_id", &settings.microphone_id)?;
        self.set_setting("show_floating_window", &settings.show_floating_window.to_string())?;

        if let Some(ref api_key) = settings.api_key {
            self.set_setting("api_key", api_key)?;
        }

        Ok(())
    }

    /// Load settings into a Settings struct
    pub fn load_settings(&self) -> Result<Settings, String> {
        let all = self.get_all_settings()?;

        Ok(Settings {
            language: all.get("language").cloned().unwrap_or_else(|| "en".to_string()),
            hotkey: all
                .get("hotkey")
                .cloned()
                .unwrap_or_else(|| "CommandOrControl+Shift+Space".to_string()),
            auto_paste: all
                .get("auto_paste")
                .map(|v| v == "true")
                .unwrap_or(true),
            polish_text: all
                .get("polish_text")
                .map(|v| v == "true")
                .unwrap_or(true),
            theme: all.get("theme").cloned().unwrap_or_else(|| "system".to_string()),
            microphone_id: all
                .get("microphone_id")
                .cloned()
                .unwrap_or_else(|| "default".to_string()),
            show_floating_window: all
                .get("show_floating_window")
                .map(|v| v == "true")
                .unwrap_or(true),
            api_key: all.get("api_key").cloned(),
        })
    }
}
```

### Step 4: Implement History CRUD

**`src-tauri/src/db/history.rs`:**
```rust
use super::Database;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: i64,
    pub raw_text: String,
    pub polished_text: Option<String>,
    pub duration_seconds: Option<f64>,
    pub word_count: Option<i32>,
    pub language: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewHistoryItem {
    pub raw_text: String,
    pub polished_text: Option<String>,
    pub duration_seconds: Option<f64>,
    pub language: String,
}

impl Database {
    /// Add a new history item
    pub fn add_history(&self, item: &NewHistoryItem) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Calculate word count
        let word_count = item
            .polished_text
            .as_ref()
            .unwrap_or(&item.raw_text)
            .split_whitespace()
            .count() as i32;

        conn.execute(
            "INSERT INTO history (raw_text, polished_text, duration_seconds, word_count, language)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                item.raw_text,
                item.polished_text,
                item.duration_seconds,
                word_count,
                item.language
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(conn.last_insert_rowid())
    }

    /// Get history items with pagination
    pub fn get_history(&self, limit: i32, offset: i32) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, raw_text, polished_text, duration_seconds, word_count, language, created_at
                 FROM history
                 ORDER BY created_at DESC
                 LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;

        let history_iter = stmt
            .query_map([limit, offset], |row| {
                Ok(HistoryItem {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    polished_text: row.get(2)?,
                    duration_seconds: row.get(3)?,
                    word_count: row.get(4)?,
                    language: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for item in history_iter {
            items.push(item.map_err(|e| e.to_string())?);
        }

        Ok(items)
    }

    /// Get a single history item by ID
    pub fn get_history_item(&self, id: i64) -> Result<Option<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let result = conn.query_row(
            "SELECT id, raw_text, polished_text, duration_seconds, word_count, language, created_at
             FROM history WHERE id = ?1",
            [id],
            |row| {
                Ok(HistoryItem {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    polished_text: row.get(2)?,
                    duration_seconds: row.get(3)?,
                    word_count: row.get(4)?,
                    language: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        );

        match result {
            Ok(item) => Ok(Some(item)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Delete a history item
    pub fn delete_history(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute("DELETE FROM history WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;

        Ok(rows_affected > 0)
    }

    /// Delete all history
    pub fn clear_history(&self) -> Result<i32, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute("DELETE FROM history", [])
            .map_err(|e| e.to_string())?;

        Ok(rows_affected as i32)
    }

    /// Search history
    pub fn search_history(&self, query: &str, limit: i32) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let search_pattern = format!("%{}%", query);

        let mut stmt = conn
            .prepare(
                "SELECT id, raw_text, polished_text, duration_seconds, word_count, language, created_at
                 FROM history
                 WHERE raw_text LIKE ?1 OR polished_text LIKE ?1
                 ORDER BY created_at DESC
                 LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;

        let history_iter = stmt
            .query_map(rusqlite::params![search_pattern, limit], |row| {
                Ok(HistoryItem {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    polished_text: row.get(2)?,
                    duration_seconds: row.get(3)?,
                    word_count: row.get(4)?,
                    language: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for item in history_iter {
            items.push(item.map_err(|e| e.to_string())?);
        }

        Ok(items)
    }

    /// Get total history count
    pub fn get_history_count(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.query_row("SELECT COUNT(*) FROM history", [], |row| row.get(0))
            .map_err(|e| e.to_string())
    }
}
```

### Step 5: Create Database Commands

**`src-tauri/src/commands/database.rs`:**
```rust
use crate::db::{Database, HistoryItem, NewHistoryItem, Settings};
use std::collections::HashMap;
use tauri::State;

// Settings commands
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

// History commands
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
```

### Step 6: Update Commands Module

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;
pub mod hotkey;
pub mod clipboard;
pub mod tray;
pub mod database;

pub use recording::*;
pub use transcription::*;
pub use hotkey::*;
pub use clipboard::*;
pub use tray::*;
pub use database::*;
```

### Step 7: Update Main.rs

**Update `src-tauri/src/main.rs`:**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod api;
mod commands;
mod hotkey;
mod clipboard;
mod tray;
mod db;

use commands::*;
use audio::AudioRecorder;
use db::Database;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Initialize database
            let db = Database::new(&app.handle())
                .expect("Failed to initialize database");
            app.manage(db);

            // Create system tray
            tray::create_tray(&app.handle())
                .expect("Failed to create system tray");

            Ok(())
        })
        .manage(RecorderState(Mutex::new(AudioRecorder::new())))
        .invoke_handler(tauri::generate_handler![
            // Recording commands
            get_microphones,
            get_default_microphone,
            start_recording,
            stop_recording,
            is_recording,
            // API commands
            transcribe,
            polish,
            transcribe_and_polish,
            // Hotkey commands
            set_global_hotkey,
            clear_global_hotkey,
            check_hotkey_available,
            // Clipboard commands
            paste,
            copy,
            get_clipboard,
            // Tray commands
            set_tray_recording,
            set_tray_processing,
            set_tray_idle,
            get_current_tray_state,
            // Database commands
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Frontend Integration

### Step 1: Update Tauri API Wrapper

**Update `src/lib/tauri.ts`:**
```typescript
import { invoke } from '@tauri-apps/api/core';

// ... existing functions ...

// Tray functions
export async function setTrayRecording(): Promise<void> {
  return invoke('set_tray_recording');
}

export async function setTrayProcessing(): Promise<void> {
  return invoke('set_tray_processing');
}

export async function setTrayIdle(): Promise<void> {
  return invoke('set_tray_idle');
}

// Database - Settings
export interface Settings {
  language: string;
  hotkey: string;
  auto_paste: boolean;
  polish_text: boolean;
  theme: string;
  microphone_id: string;
  show_floating_window: boolean;
  api_key?: string;
}

export async function dbLoadSettings(): Promise<Settings> {
  return invoke('db_load_settings');
}

export async function dbSaveSettings(settings: Settings): Promise<void> {
  return invoke('db_save_settings', { settings });
}

export async function dbGetSetting(key: string): Promise<string | null> {
  return invoke('db_get_setting', { key });
}

export async function dbSetSetting(key: string, value: string): Promise<void> {
  return invoke('db_set_setting', { key, value });
}

// Database - History
export interface HistoryItem {
  id: number;
  raw_text: string;
  polished_text: string | null;
  duration_seconds: number | null;
  word_count: number | null;
  language: string;
  created_at: string;
}

export interface NewHistoryItem {
  raw_text: string;
  polished_text?: string;
  duration_seconds?: number;
  language: string;
}

export async function dbAddHistory(item: NewHistoryItem): Promise<number> {
  return invoke('db_add_history', { item });
}

export async function dbGetHistory(limit?: number, offset?: number): Promise<HistoryItem[]> {
  return invoke('db_get_history', { limit, offset });
}

export async function dbGetHistoryItem(id: number): Promise<HistoryItem | null> {
  return invoke('db_get_history_item', { id });
}

export async function dbDeleteHistory(id: number): Promise<boolean> {
  return invoke('db_delete_history', { id });
}

export async function dbClearHistory(): Promise<number> {
  return invoke('db_clear_history');
}

export async function dbSearchHistory(query: string, limit?: number): Promise<HistoryItem[]> {
  return invoke('db_search_history', { query, limit });
}

export async function dbGetHistoryCount(): Promise<number> {
  return invoke('db_get_history_count');
}
```

### Step 2: Update Hotkey Hook with Tray and History

**Update `src/hooks/useHotkey.ts`:**
```typescript
import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTauriEvent } from './useTauriEvents';
import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  startRecording,
  stopRecording,
  transcribeAndPolish,
  setTrayRecording,
  setTrayProcessing,
  setTrayIdle,
  dbAddHistory,
} from '../lib/tauri';

export function useHotkey() {
  const { state, setState, setTranscript, setError, reset } = useRecordingStore();
  const { apiKey, language, shouldPolish, hotkey, autoPaste } = useSettingsStore();

  // Register hotkey on mount
  useEffect(() => {
    const registerHotkey = async () => {
      try {
        await invoke('set_global_hotkey', { hotkey });
      } catch (err) {
        console.error('Failed to register hotkey:', err);
      }
    };

    registerHotkey();

    return () => {
      invoke('clear_global_hotkey').catch(console.error);
    };
  }, [hotkey]);

  // Handle hotkey press
  const handleHotkeyPress = useCallback(async () => {
    if (state === 'processing') return;

    if (state === 'idle') {
      if (!apiKey) {
        setError('Please configure your OpenAI API key');
        return;
      }

      try {
        await startRecording();
        await setTrayRecording();
        setState('recording');
      } catch (err) {
        setError(err as string);
      }
    } else if (state === 'recording') {
      setState('processing');
      await setTrayProcessing();

      const startTime = Date.now();

      try {
        const audioData = await stopRecording();
        
        const result = await transcribeAndPolish(
          audioData,
          apiKey,
          language,
          shouldPolish
        );

        const finalText = result.polished_text || result.raw_text;
        const durationSeconds = (Date.now() - startTime) / 1000;

        setTranscript(finalText);

        // Save to history
        await dbAddHistory({
          raw_text: result.raw_text,
          polished_text: result.polished_text || undefined,
          duration_seconds: durationSeconds,
          language,
        });

        // Auto-paste if enabled
        if (autoPaste) {
          await invoke('paste', { text: finalText, restoreClipboard: true });
        }

        setState('done');
        await setTrayIdle();

        setTimeout(() => {
          reset();
        }, 2000);
      } catch (err) {
        setError(err as string);
        setState('idle');
        await setTrayIdle();
      }
    } else if (state === 'done') {
      reset();
    }
  }, [state, apiKey, language, shouldPolish, autoPaste, setState, setTranscript, setError, reset]);

  // Listen for events
  useTauriEvent('hotkey_pressed', handleHotkeyPress);
  useTauriEvent('toggle_recording', handleHotkeyPress);

  return { handleHotkeyPress };
}
```

---

## Verification Checklist

Before moving to Phase 5, verify:

- [ ] System tray icon appears
- [ ] Tray menu shows correct items
- [ ] Clicking tray toggles recording
- [ ] Tray tooltip updates with state
- [ ] Database file is created in app data directory
- [ ] Settings persist across app restarts
- [ ] History items are saved after each dictation
- [ ] History can be retrieved and displayed
- [ ] History search works correctly
- [ ] Delete history works

---

## Next Steps

After completing Phase 4, proceed to [Phase 5: Settings & History UI](./PHASE_5_SETTINGS_HISTORY.md)
