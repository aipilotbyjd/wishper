use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use std::sync::atomic::{AtomicBool, Ordering};

static IS_REGISTERED: AtomicBool = AtomicBool::new(false);

pub fn parse_hotkey(hotkey: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = hotkey.split('+').collect();
    
    let mut modifiers = Modifiers::empty();
    let mut key_code = None;
    
    for part in parts {
        match part.to_lowercase().as_str() {
            "command" | "cmd" | "meta" | "commandorcontrol" | "cmdorctrl" => {
                modifiers |= Modifiers::META;
            }
            "control" | "ctrl" => {
                modifiers |= Modifiers::CONTROL;
            }
            "shift" => {
                modifiers |= Modifiers::SHIFT;
            }
            "alt" | "option" => {
                modifiers |= Modifiers::ALT;
            }
            "space" => key_code = Some(Code::Space),
            "enter" | "return" => key_code = Some(Code::Enter),
            "f5" => key_code = Some(Code::F5),
            "f6" => key_code = Some(Code::F6),
            "f7" => key_code = Some(Code::F7),
            "f8" => key_code = Some(Code::F8),
            _ => {
                if part.len() == 1 {
                    let c = part.chars().next().unwrap().to_ascii_uppercase();
                    key_code = match c {
                        'A' => Some(Code::KeyA), 'B' => Some(Code::KeyB), 'C' => Some(Code::KeyC),
                        'D' => Some(Code::KeyD), 'E' => Some(Code::KeyE), 'F' => Some(Code::KeyF),
                        'G' => Some(Code::KeyG), 'H' => Some(Code::KeyH), 'I' => Some(Code::KeyI),
                        'J' => Some(Code::KeyJ), 'K' => Some(Code::KeyK), 'L' => Some(Code::KeyL),
                        'M' => Some(Code::KeyM), 'N' => Some(Code::KeyN), 'O' => Some(Code::KeyO),
                        'P' => Some(Code::KeyP), 'Q' => Some(Code::KeyQ), 'R' => Some(Code::KeyR),
                        'S' => Some(Code::KeyS), 'T' => Some(Code::KeyT), 'U' => Some(Code::KeyU),
                        'V' => Some(Code::KeyV), 'W' => Some(Code::KeyW), 'X' => Some(Code::KeyX),
                        'Y' => Some(Code::KeyY), 'Z' => Some(Code::KeyZ),
                        _ => None,
                    };
                }
            }
        }
    }
    
    match key_code {
        Some(code) => Ok(Shortcut::new(Some(modifiers), code)),
        None => Err("Invalid hotkey format".to_string()),
    }
}

pub fn register_hotkey(app: &AppHandle, hotkey_str: &str) -> Result<(), String> {
    let shortcut = parse_hotkey(hotkey_str)?;
    
    if IS_REGISTERED.load(Ordering::SeqCst) {
        let _ = app.global_shortcut().unregister_all();
        IS_REGISTERED.store(false, Ordering::SeqCst);
    }
    
    let app_handle = app.clone();
    
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = app_handle.emit("hotkey_pressed", ());
            }
        })
        .map_err(|e| e.to_string())?;
    
    IS_REGISTERED.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn unregister_hotkeys(app: &AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;
    IS_REGISTERED.store(false, Ordering::SeqCst);
    Ok(())
}

pub fn is_hotkey_available(app: &AppHandle, hotkey_str: &str) -> Result<bool, String> {
    let shortcut = parse_hotkey(hotkey_str)?;
    
    match app.global_shortcut().register(shortcut.clone()) {
        Ok(_) => {
            let _ = app.global_shortcut().unregister(shortcut);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}
