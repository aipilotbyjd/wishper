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
    pub fn add_history(&self, item: &NewHistoryItem) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

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

    pub fn get_history(&self, limit: i32, offset: i32) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, raw_text, polished_text, duration_seconds, word_count, language, created_at
                 FROM history ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
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

    pub fn delete_history(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn
            .execute("DELETE FROM history WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(rows > 0)
    }

    pub fn clear_history(&self) -> Result<i32, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
        Ok(rows as i32)
    }

    pub fn search_history(&self, query: &str, limit: i32) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let search_pattern = format!("%{}%", query);

        let mut stmt = conn
            .prepare(
                "SELECT id, raw_text, polished_text, duration_seconds, word_count, language, created_at
                 FROM history WHERE raw_text LIKE ?1 OR polished_text LIKE ?1
                 ORDER BY created_at DESC LIMIT ?2",
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

    pub fn get_history_count(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row("SELECT COUNT(*) FROM history", [], |row| row.get(0))
            .map_err(|e| e.to_string())
    }
}
