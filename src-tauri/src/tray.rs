use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};
use std::sync::atomic::{AtomicU8, Ordering};

pub const TRAY_STATE_IDLE: u8 = 0;
pub const TRAY_STATE_RECORDING: u8 = 1;
pub const TRAY_STATE_PROCESSING: u8 = 2;

static CURRENT_STATE: AtomicU8 = AtomicU8::new(TRAY_STATE_IDLE);

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Start Recording", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let history_item = MenuItem::with_id(app, "history", "History", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Wishper", true, Some("CmdOrCtrl+Q"))?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle_item,
            &separator1,
            &settings_item,
            &history_item,
            &separator2,
            &quit_item,
        ],
    )?;

    let app_handle = app.clone();
    
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Wishper - Click to toggle recording")
        .on_menu_event(move |app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(move |_tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = app_handle.emit("toggle_recording", ());
            }
        })
        .build(app)?;

    Ok(())
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event_id: &str) {
    match event_id {
        "toggle" => {
            let _ = app.emit("toggle_recording", ());
        }
        "settings" => {
            let _ = app.emit("open_settings", ());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "history" => {
            let _ = app.emit("open_history", ());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

pub fn update_tray_state<R: Runtime>(app: &AppHandle<R>, state: u8) -> Result<(), String> {
    CURRENT_STATE.store(state, Ordering::SeqCst);
    
    // Note: Updating tray tooltip requires tray ID which we didn't set
    // For now, just store the state
    let _ = app; // suppress unused warning
    let _ = state;

    Ok(())
}

pub fn get_tray_state() -> u8 {
    CURRENT_STATE.load(Ordering::SeqCst)
}
