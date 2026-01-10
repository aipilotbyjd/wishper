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
            show_floating_window: true,
            api_key: None,
        }
    }
}

impl Database {
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

    pub fn load_settings(&self) -> Result<Settings, String> {
        let all = self.get_all_settings()?;

        Ok(Settings {
            language: all.get("language").cloned().unwrap_or_else(|| "en".to_string()),
            hotkey: all
                .get("hotkey")
                .cloned()
                .unwrap_or_else(|| "CommandOrControl+Shift+Space".to_string()),
            auto_paste: all.get("auto_paste").map(|v| v == "true").unwrap_or(true),
            polish_text: all.get("polish_text").map(|v| v == "true").unwrap_or(true),
            theme: all.get("theme").cloned().unwrap_or_else(|| "system".to_string()),
            show_floating_window: all.get("show_floating_window").map(|v| v == "true").unwrap_or(true),
            api_key: all.get("api_key").cloned(),
        })
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), String> {
        self.set_setting("language", &settings.language)?;
        self.set_setting("hotkey", &settings.hotkey)?;
        self.set_setting("auto_paste", &settings.auto_paste.to_string())?;
        self.set_setting("polish_text", &settings.polish_text.to_string())?;
        self.set_setting("theme", &settings.theme)?;
        self.set_setting("show_floating_window", &settings.show_floating_window.to_string())?;

        if let Some(ref api_key) = settings.api_key {
            self.set_setting("api_key", api_key)?;
        }

        Ok(())
    }
}
