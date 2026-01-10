use super::Database;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DictionaryWord {
    pub id: i64,
    pub word: String,
    pub pronunciation: Option<String>,
    pub category: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewDictionaryWord {
    pub word: String,
    pub pronunciation: Option<String>,
    pub category: Option<String>,
}

impl Database {
    pub fn add_dictionary_word(&self, word: &NewDictionaryWord) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO dictionary (word, pronunciation, category) VALUES (?1, ?2, ?3)",
            rusqlite::params![word.word, word.pronunciation, word.category],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "Word already exists".to_string()
            } else {
                e.to_string()
            }
        })?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_dictionary(&self) -> Result<Vec<DictionaryWord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, word, pronunciation, category, created_at FROM dictionary ORDER BY word ASC")
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map([], |row| {
                Ok(DictionaryWord {
                    id: row.get(0)?,
                    word: row.get(1)?,
                    pronunciation: row.get(2)?,
                    category: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;

        iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_dictionary_word(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let rows = conn
            .execute("DELETE FROM dictionary WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(rows > 0)
    }

    pub fn get_dictionary_prompt(&self) -> Result<String, String> {
        let words = self.get_dictionary()?;
        if words.is_empty() {
            return Ok(String::new());
        }
        let list: Vec<String> = words
            .iter()
            .map(|w| {
                if let Some(ref pron) = w.pronunciation {
                    format!("{} ({})", w.word, pron)
                } else {
                    w.word.clone()
                }
            })
            .collect();
        Ok(list.join(", "))
    }

    pub fn import_dictionary(&self, words: Vec<NewDictionaryWord>) -> Result<i32, String> {
        let mut imported = 0;
        for word in words {
            match self.add_dictionary_word(&word) {
                Ok(_) => imported += 1,
                Err(e) if e.contains("already exists") => continue,
                Err(e) => return Err(e),
            }
        }
        Ok(imported)
    }

    pub fn export_dictionary(&self) -> Result<Vec<NewDictionaryWord>, String> {
        let words = self.get_dictionary()?;
        Ok(words
            .into_iter()
            .map(|w| NewDictionaryWord {
                word: w.word,
                pronunciation: w.pronunciation,
                category: w.category,
            })
            .collect())
    }
}
