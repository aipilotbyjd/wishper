# Phase 6: Advanced Features (Week 6)

> **Duration:** Days 36-42
> **Goal:** Implement Personal Dictionary and Voice Snippets features

---

## Day 36-38: Personal Dictionary

### Step 1: Add Dictionary Database Functions

**`src-tauri/src/db/dictionary.rs`:**
```rust
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
    /// Add a new word to the dictionary
    pub fn add_dictionary_word(&self, word: &NewDictionaryWord) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO dictionary (word, pronunciation, category) VALUES (?1, ?2, ?3)",
            rusqlite::params![word.word, word.pronunciation, word.category],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "Word already exists in dictionary".to_string()
            } else {
                e.to_string()
            }
        })?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all dictionary words
    pub fn get_dictionary(&self) -> Result<Vec<DictionaryWord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, word, pronunciation, category, created_at
                 FROM dictionary ORDER BY word ASC",
            )
            .map_err(|e| e.to_string())?;

        let words_iter = stmt
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

        let mut words = Vec::new();
        for word in words_iter {
            words.push(word.map_err(|e| e.to_string())?);
        }

        Ok(words)
    }

    /// Get dictionary words by category
    pub fn get_dictionary_by_category(&self, category: &str) -> Result<Vec<DictionaryWord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, word, pronunciation, category, created_at
                 FROM dictionary WHERE category = ?1 ORDER BY word ASC",
            )
            .map_err(|e| e.to_string())?;

        let words_iter = stmt
            .query_map([category], |row| {
                Ok(DictionaryWord {
                    id: row.get(0)?,
                    word: row.get(1)?,
                    pronunciation: row.get(2)?,
                    category: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut words = Vec::new();
        for word in words_iter {
            words.push(word.map_err(|e| e.to_string())?);
        }

        Ok(words)
    }

    /// Delete a dictionary word
    pub fn delete_dictionary_word(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute("DELETE FROM dictionary WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;

        Ok(rows_affected > 0)
    }

    /// Update a dictionary word
    pub fn update_dictionary_word(&self, id: i64, word: &NewDictionaryWord) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute(
                "UPDATE dictionary SET word = ?1, pronunciation = ?2, category = ?3 WHERE id = ?4",
                rusqlite::params![word.word, word.pronunciation, word.category, id],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows_affected > 0)
    }

    /// Get dictionary words as a prompt string for Whisper
    pub fn get_dictionary_prompt(&self) -> Result<String, String> {
        let words = self.get_dictionary()?;
        
        if words.is_empty() {
            return Ok(String::new());
        }

        // Format words for Whisper prompt
        let word_list: Vec<String> = words
            .iter()
            .map(|w| {
                if let Some(ref pron) = w.pronunciation {
                    format!("{} ({})", w.word, pron)
                } else {
                    w.word.clone()
                }
            })
            .collect();

        Ok(word_list.join(", "))
    }

    /// Import dictionary from JSON
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

    /// Export dictionary to vector
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
```

### Step 2: Create Dictionary Commands

**`src-tauri/src/commands/dictionary.rs`:**
```rust
use crate::db::{Database, DictionaryWord, NewDictionaryWord};
use tauri::State;

#[tauri::command]
pub fn db_add_dictionary_word(
    db: State<Database>,
    word: NewDictionaryWord,
) -> Result<i64, String> {
    db.add_dictionary_word(&word)
}

#[tauri::command]
pub fn db_get_dictionary(db: State<Database>) -> Result<Vec<DictionaryWord>, String> {
    db.get_dictionary()
}

#[tauri::command]
pub fn db_get_dictionary_by_category(
    db: State<Database>,
    category: String,
) -> Result<Vec<DictionaryWord>, String> {
    db.get_dictionary_by_category(&category)
}

#[tauri::command]
pub fn db_delete_dictionary_word(db: State<Database>, id: i64) -> Result<bool, String> {
    db.delete_dictionary_word(id)
}

#[tauri::command]
pub fn db_update_dictionary_word(
    db: State<Database>,
    id: i64,
    word: NewDictionaryWord,
) -> Result<bool, String> {
    db.update_dictionary_word(id, &word)
}

#[tauri::command]
pub fn db_get_dictionary_prompt(db: State<Database>) -> Result<String, String> {
    db.get_dictionary_prompt()
}

#[tauri::command]
pub fn db_import_dictionary(
    db: State<Database>,
    words: Vec<NewDictionaryWord>,
) -> Result<i32, String> {
    db.import_dictionary(words)
}

#[tauri::command]
pub fn db_export_dictionary(db: State<Database>) -> Result<Vec<NewDictionaryWord>, String> {
    db.export_dictionary()
}
```

### Step 3: Update Whisper API to Use Dictionary

**Update `src-tauri/src/api/whisper.rs`:**
```rust
// Add prompt parameter to transcribe_audio
pub async fn transcribe_audio(
    audio_data: Vec<u8>,
    api_key: &str,
    language: &str,
    prompt: Option<&str>,
) -> Result<String, ApiError> {
    // ... existing validation ...

    let mut form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("language", language.to_string())
        .text("response_format", "json");

    // Add prompt if provided (for custom vocabulary)
    if let Some(p) = prompt {
        if !p.is_empty() {
            form = form.text("prompt", p.to_string());
        }
    }

    // ... rest of the function ...
}
```

### Step 4: Create Dictionary UI Component

**`src/components/Dictionary/DictionaryPanel.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DictionaryWord } from './DictionaryWord';
import { AddWordForm } from './AddWordForm';
import {
  dbGetDictionary,
  dbAddDictionaryWord,
  dbDeleteDictionaryWord,
  dbExportDictionary,
  dbImportDictionary,
  type DictionaryWord as DictionaryWordType,
  type NewDictionaryWord,
} from '../../lib/tauri';

interface DictionaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['name', 'technical', 'acronym', 'other'];

export const DictionaryPanel = ({ isOpen, onClose }: DictionaryPanelProps) => {
  const [words, setWords] = useState<DictionaryWordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDictionary();
    }
  }, [isOpen]);

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const data = await dbGetDictionary();
      setWords(data);
    } catch (err) {
      console.error('Failed to load dictionary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (word: NewDictionaryWord) => {
    try {
      await dbAddDictionaryWord(word);
      await loadDictionary();
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add word:', err);
      throw err;
    }
  };

  const handleDeleteWord = async (id: number) => {
    try {
      await dbDeleteDictionaryWord(id);
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  };

  const handleExport = async () => {
    try {
      const data = await dbExportDictionary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voiceflow-dictionary.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export dictionary:', err);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      try {
        const data = JSON.parse(text) as NewDictionaryWord[];
        const imported = await dbImportDictionary(data);
        alert(`Imported ${imported} words`);
        await loadDictionary();
      } catch (err) {
        console.error('Failed to import dictionary:', err);
        alert('Failed to import dictionary. Please check the file format.');
      }
    };
    input.click();
  };

  const filteredWords = filter
    ? words.filter((w) => w.category === filter)
    : words;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">Personal Dictionary</h2>
              <p className="text-sm text-gray-500">{words.length} words</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter(null)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  filter === null ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                    filter === cat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Import
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Export
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Word
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {filter ? `No ${filter} words in dictionary` : 'No words in dictionary yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWords.map((word) => (
                  <DictionaryWord
                    key={word.id}
                    word={word}
                    onDelete={() => handleDeleteWord(word.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add Word Form Modal */}
          {showAddForm && (
            <AddWordForm
              onAdd={handleAddWord}
              onClose={() => setShowAddForm(false)}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
```

**`src/components/Dictionary/DictionaryWord.tsx`:**
```tsx
import type { DictionaryWord as DictionaryWordType } from '../../lib/tauri';

interface DictionaryWordProps {
  word: DictionaryWordType;
  onDelete: () => void;
}

export const DictionaryWord = ({ word, onDelete }: DictionaryWordProps) => {
  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'name':
        return 'bg-purple-100 text-purple-700';
      case 'technical':
        return 'bg-blue-100 text-blue-700';
      case 'acronym':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-900">{word.word}</span>
        {word.pronunciation && (
          <span className="text-sm text-gray-500 italic">/{word.pronunciation}/</span>
        )}
        {word.category && (
          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getCategoryColor(word.category)}`}>
            {word.category}
          </span>
        )}
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
```

**`src/components/Dictionary/AddWordForm.tsx`:**
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { NewDictionaryWord } from '../../lib/tauri';

interface AddWordFormProps {
  onAdd: (word: NewDictionaryWord) => Promise<void>;
  onClose: () => void;
}

export const AddWordForm = ({ onAdd, onClose }: AddWordFormProps) => {
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) {
      setError('Word is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd({
        word: word.trim(),
        pronunciation: pronunciation.trim() || undefined,
        category: category || undefined,
      });
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Word</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Word *
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g., Kubernetes"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pronunciation (optional)
            </label>
            <input
              type="text"
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder="e.g., koo-ber-NET-eez"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category...</option>
              <option value="name">Name</option>
              <option value="technical">Technical</option>
              <option value="acronym">Acronym</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Word'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
```

---

## Day 39-42: Voice Snippets

### Step 1: Add Snippets Database Functions

**`src-tauri/src/db/snippets.rs`:**
```rust
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

impl Database {
    /// Add a new snippet
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

    /// Get all snippets
    pub fn get_snippets(&self) -> Result<Vec<Snippet>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, trigger_phrase, content, use_count, created_at
                 FROM snippets ORDER BY use_count DESC, trigger_phrase ASC",
            )
            .map_err(|e| e.to_string())?;

        let snippets_iter = stmt
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

        let mut snippets = Vec::new();
        for snippet in snippets_iter {
            snippets.push(snippet.map_err(|e| e.to_string())?);
        }

        Ok(snippets)
    }

    /// Find snippet by trigger phrase (case-insensitive)
    pub fn find_snippet_by_trigger(&self, trigger: &str) -> Result<Option<Snippet>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let result = conn.query_row(
            "SELECT id, trigger_phrase, content, use_count, created_at
             FROM snippets WHERE trigger_phrase = ?1",
            [trigger.to_lowercase()],
            |row| {
                Ok(Snippet {
                    id: row.get(0)?,
                    trigger_phrase: row.get(1)?,
                    content: row.get(2)?,
                    use_count: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        );

        match result {
            Ok(snippet) => Ok(Some(snippet)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Increment snippet use count
    pub fn increment_snippet_use(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE snippets SET use_count = use_count + 1 WHERE id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Delete a snippet
    pub fn delete_snippet(&self, id: i64) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute("DELETE FROM snippets WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;

        Ok(rows_affected > 0)
    }

    /// Update a snippet
    pub fn update_snippet(&self, id: i64, snippet: &NewSnippet) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn
            .execute(
                "UPDATE snippets SET trigger_phrase = ?1, content = ?2 WHERE id = ?3",
                rusqlite::params![snippet.trigger_phrase.to_lowercase(), snippet.content, id],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows_affected > 0)
    }

    /// Process text and replace trigger phrases with snippet content
    pub fn process_snippets(&self, text: &str) -> Result<(String, Vec<i64>), String> {
        let snippets = self.get_snippets()?;
        let mut result = text.to_string();
        let mut used_snippet_ids = Vec::new();

        for snippet in snippets {
            let trigger_lower = snippet.trigger_phrase.to_lowercase();
            let text_lower = result.to_lowercase();

            if text_lower.contains(&trigger_lower) {
                // Case-insensitive replacement
                let re = regex::RegexBuilder::new(&regex::escape(&trigger_lower))
                    .case_insensitive(true)
                    .build()
                    .map_err(|e| e.to_string())?;

                result = re.replace_all(&result, snippet.content.as_str()).to_string();
                used_snippet_ids.push(snippet.id);
            }
        }

        Ok((result, used_snippet_ids))
    }
}
```

### Step 2: Create Snippet Commands

**`src-tauri/src/commands/snippets.rs`:**
```rust
use crate::db::{Database, Snippet, NewSnippet};
use tauri::State;

#[tauri::command]
pub fn db_add_snippet(db: State<Database>, snippet: NewSnippet) -> Result<i64, String> {
    db.add_snippet(&snippet)
}

#[tauri::command]
pub fn db_get_snippets(db: State<Database>) -> Result<Vec<Snippet>, String> {
    db.get_snippets()
}

#[tauri::command]
pub fn db_find_snippet(db: State<Database>, trigger: String) -> Result<Option<Snippet>, String> {
    db.find_snippet_by_trigger(&trigger)
}

#[tauri::command]
pub fn db_delete_snippet(db: State<Database>, id: i64) -> Result<bool, String> {
    db.delete_snippet(id)
}

#[tauri::command]
pub fn db_update_snippet(
    db: State<Database>,
    id: i64,
    snippet: NewSnippet,
) -> Result<bool, String> {
    db.update_snippet(id, &snippet)
}

#[tauri::command]
pub fn db_process_snippets(
    db: State<Database>,
    text: String,
) -> Result<ProcessedSnippetResult, String> {
    let (processed_text, used_ids) = db.process_snippets(&text)?;

    // Increment use counts
    for id in &used_ids {
        let _ = db.increment_snippet_use(*id);
    }

    Ok(ProcessedSnippetResult {
        text: processed_text,
        snippets_used: used_ids.len() as i32,
    })
}

#[derive(serde::Serialize)]
pub struct ProcessedSnippetResult {
    pub text: String,
    pub snippets_used: i32,
}
```

### Step 3: Create Snippets UI Component

**`src/components/Snippets/SnippetsPanel.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SnippetItem } from './SnippetItem';
import { AddSnippetForm } from './AddSnippetForm';
import {
  dbGetSnippets,
  dbAddSnippet,
  dbDeleteSnippet,
  type Snippet,
  type NewSnippet,
} from '../../lib/tauri';

interface SnippetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnippetsPanel = ({ isOpen, onClose }: SnippetsPanelProps) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSnippets();
    }
  }, [isOpen]);

  const loadSnippets = async () => {
    setLoading(true);
    try {
      const data = await dbGetSnippets();
      setSnippets(data);
    } catch (err) {
      console.error('Failed to load snippets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSnippet = async (snippet: NewSnippet) => {
    try {
      await dbAddSnippet(snippet);
      await loadSnippets();
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add snippet:', err);
      throw err;
    }
  };

  const handleDeleteSnippet = async (id: number) => {
    try {
      await dbDeleteSnippet(id);
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">Voice Snippets</h2>
              <p className="text-sm text-gray-500">
                Say trigger phrases to insert text
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Snippet
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : snippets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No snippets yet</p>
                <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">Example Snippets</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>
                      <strong>"insert signature"</strong> → Your full email signature
                    </li>
                    <li>
                      <strong>"my address"</strong> → Your physical address
                    </li>
                    <li>
                      <strong>"standard greeting"</strong> → "Hi, I hope this email finds you well."
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {snippets.map((snippet) => (
                  <SnippetItem
                    key={snippet.id}
                    snippet={snippet}
                    onDelete={() => handleDeleteSnippet(snippet.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add Snippet Form Modal */}
          {showAddForm && (
            <AddSnippetForm
              onAdd={handleAddSnippet}
              onClose={() => setShowAddForm(false)}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
```

**`src/components/Snippets/SnippetItem.tsx`:**
```tsx
import { useState } from 'react';
import type { Snippet } from '../../lib/tauri';

interface SnippetItemProps {
  snippet: Snippet;
  onDelete: () => void;
}

export const SnippetItem = ({ snippet, onDelete }: SnippetItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between">
        <div
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              "{snippet.trigger_phrase}"
            </span>
            {snippet.use_count > 0 && (
              <span className="text-xs text-gray-500">
                Used {snippet.use_count} time{snippet.use_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className={`text-gray-600 mt-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {snippet.content}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
```

**`src/components/Snippets/AddSnippetForm.tsx`:**
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { NewSnippet } from '../../lib/tauri';

interface AddSnippetFormProps {
  onAdd: (snippet: NewSnippet) => Promise<void>;
  onClose: () => void;
}

export const AddSnippetForm = ({ onAdd, onClose }: AddSnippetFormProps) => {
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!triggerPhrase.trim()) {
      setError('Trigger phrase is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd({
        trigger_phrase: triggerPhrase.trim(),
        content: content.trim(),
      });
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Snippet</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Phrase *
            </label>
            <input
              type="text"
              value={triggerPhrase}
              onChange={(e) => setTriggerPhrase(e.target.value)}
              placeholder="e.g., insert signature"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Say this phrase to insert the content below
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The text to insert when trigger is spoken..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Snippet'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
```

---

## Integration with Transcription Flow

Update the hotkey hook to process snippets after polishing:

**Update `src/hooks/useHotkey.ts`:**
```typescript
// Add to imports
import { dbProcessSnippets, dbGetDictionaryPrompt } from '../lib/tauri';

// In handleHotkeyPress, after getting polished text:
const result = await transcribeAndPolish(
  audioData,
  apiKey,
  language,
  shouldPolish,
  dictionaryPrompt // Pass dictionary prompt to Whisper
);

let finalText = result.polished_text || result.raw_text;

// Process snippets
const snippetResult = await dbProcessSnippets(finalText);
finalText = snippetResult.text;

setTranscript(finalText);
```

---

## Update Module Exports

**Update `src-tauri/src/db/mod.rs`:**
```rust
pub mod schema;
pub mod settings;
pub mod history;
pub mod dictionary;
pub mod snippets;
pub mod migrations;

pub use schema::Database;
pub use settings::*;
pub use history::*;
pub use dictionary::*;
pub use snippets::*;
```

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;
pub mod hotkey;
pub mod clipboard;
pub mod tray;
pub mod database;
pub mod dictionary;
pub mod snippets;

pub use recording::*;
pub use transcription::*;
pub use hotkey::*;
pub use clipboard::*;
pub use tray::*;
pub use database::*;
pub use dictionary::*;
pub use snippets::*;
```

---

## Verification Checklist

Before moving to Phase 7, verify:

- [ ] Dictionary words can be added/edited/deleted
- [ ] Dictionary import/export works
- [ ] Dictionary prompt is sent to Whisper
- [ ] Snippets can be added/edited/deleted
- [ ] Trigger phrases are replaced with content
- [ ] Snippet use counts are tracked
- [ ] Both features integrate with transcription flow

---

## Next Steps

After completing Phase 6, proceed to [Phase 7: Polish & Edge Cases](./PHASE_7_POLISH.md)
