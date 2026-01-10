use arboard::Clipboard;
use enigo::{Enigo, Key, Keyboard, Settings, Direction};
use std::thread;
use std::time::Duration;

pub fn paste_text(text: &str, restore_clipboard: bool) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    
    let previous_content = if restore_clipboard {
        clipboard.get_text().ok()
    } else {
        None
    };
    
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    
    thread::sleep(Duration::from_millis(50));
    
    simulate_paste()?;
    
    if let Some(prev) = previous_content {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(500));
            if let Ok(mut cb) = Clipboard::new() {
                let _ = cb.set_text(&prev);
            }
        });
    }
    
    Ok(())
}

fn simulate_paste() -> Result<(), String> {
    let settings = Settings::default();
    let mut enigo = Enigo::new(&settings).map_err(|e| e.to_string())?;
    
    enigo.key(Key::Meta, Direction::Press).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(10));
    enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(10));
    enigo.key(Key::Meta, Direction::Release).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn copy_to_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())
}

pub fn get_clipboard_content() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.get_text().map_err(|e| e.to_string())
}
