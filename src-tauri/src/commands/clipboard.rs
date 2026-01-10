use crate::clipboard::{paste_text, copy_to_clipboard, get_clipboard_content};

#[tauri::command]
pub fn paste(text: String, restore_clipboard: bool) -> Result<(), String> {
    paste_text(&text, restore_clipboard)
}

#[tauri::command]
pub fn copy(text: String) -> Result<(), String> {
    copy_to_clipboard(&text)
}

#[tauri::command]
pub fn get_clipboard() -> Result<String, String> {
    get_clipboard_content()
}
