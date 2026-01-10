use crate::db::{dictionary::{DictionaryWord, NewDictionaryWord}, Database};
use tauri::State;

#[tauri::command]
pub fn db_add_dictionary_word(db: State<Database>, word: NewDictionaryWord) -> Result<i64, String> {
    db.add_dictionary_word(&word)
}

#[tauri::command]
pub fn db_get_dictionary(db: State<Database>) -> Result<Vec<DictionaryWord>, String> {
    db.get_dictionary()
}

#[tauri::command]
pub fn db_delete_dictionary_word(db: State<Database>, id: i64) -> Result<bool, String> {
    db.delete_dictionary_word(id)
}

#[tauri::command]
pub fn db_get_dictionary_prompt(db: State<Database>) -> Result<String, String> {
    db.get_dictionary_prompt()
}

#[tauri::command]
pub fn db_import_dictionary(db: State<Database>, words: Vec<NewDictionaryWord>) -> Result<i32, String> {
    db.import_dictionary(words)
}

#[tauri::command]
pub fn db_export_dictionary(db: State<Database>) -> Result<Vec<NewDictionaryWord>, String> {
    db.export_dictionary()
}
