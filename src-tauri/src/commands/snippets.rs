use crate::db::{snippets::{Snippet, NewSnippet, ProcessedSnippetResult}, Database};
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
pub fn db_delete_snippet(db: State<Database>, id: i64) -> Result<bool, String> {
    db.delete_snippet(id)
}

#[tauri::command]
pub fn db_process_snippets(db: State<Database>, text: String) -> Result<ProcessedSnippetResult, String> {
    db.process_snippets(&text)
}
