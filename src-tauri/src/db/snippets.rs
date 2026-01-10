use super::Database;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snippet {
    pub id: i64,
    pub trigger_phrase: String,
    pub content: String,
    pub use_count: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewSnippet {
    pub trigger_phrase: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessedSnippetResult {
    pub text: String,
    pub snippets_used: i32,
}

impl Database {
    pub fn add_snippet(&self, snippet: &NewSnippet) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO snippets (trigger_phrase, content) VALUES (?1, ?2)",
            rusqlite::params![snippet.trigger_phrase.to_lowercase(), snippet.content],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "Trigger phrase already exists".to_string()
            } else {
                e.to_string()
            }
        })?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_snippets(&self) -> Result<Vec<Snippet>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, trigger_phrase, content, use_count, created_at FROM snippets ORDER BY use_count DESC")
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map([], |row| {
                Ok(Snippet {
                    id: row.get(0)?,
                    trigger_phrase: row.get(1)?,
                    content: row.get(2)?,
                    use_count: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;

        iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_snippet(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn
            .execute("DELETE FROM snippets WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(rows > 0)
    }

    pub fn increment_snippet_use(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE snippets SET use_count = use_count + 1 WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn process_snippets(&self, text: &str) -> Result<ProcessedSnippetResult, String> {
        let snippets = self.get_snippets()?;
        let mut result = text.to_string();
        let mut used_ids = Vec::new();

        for snippet in snippets {
            let trigger = &snippet.trigger_phrase;
            if result.to_lowercase().contains(trigger) {
                // Case-insensitive replace
                let mut new_result = String::new();
                let mut remaining = result.as_str();
                while let Some(idx) = remaining.to_lowercase().find(trigger) {
                    new_result.push_str(&remaining[..idx]);
                    new_result.push_str(&snippet.content);
                    remaining = &remaining[idx + trigger.len()..];
                    if !used_ids.contains(&snippet.id) {
                        used_ids.push(snippet.id);
                    }
                }
                new_result.push_str(remaining);
                result = new_result;
            }
        }

        // Increment use counts
        for id in &used_ids {
            let _ = self.increment_snippet_use(*id);
        }

        Ok(ProcessedSnippetResult {
            text: result,
            snippets_used: used_ids.len() as i32,
        })
    }
}
