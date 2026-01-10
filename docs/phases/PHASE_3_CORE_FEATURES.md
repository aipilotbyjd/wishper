# Phase 3: Core Features - Hotkey & Auto-Paste (Week 3)

> **Duration:** Days 15-21
> **Goal:** Implement global hotkey for recording and auto-paste functionality

---

## Day 15-17: Global Hotkey Implementation

### Step 1: Update Tauri Configuration

**Update `src-tauri/tauri.conf.json`** to enable global shortcut plugin:
```json
{
  "plugins": {
    "global-shortcut": {
      "all": true
    }
  },
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.openai.com"
    }
  }
}
```

### Step 2: Add Required Dependencies

**Update `src-tauri/Cargo.toml`:**
```toml
[dependencies]
# ... existing dependencies ...
tauri-plugin-global-shortcut = "2"
```

### Step 3: Create Hotkey Module

**`src-tauri/src/hotkey.rs`:**
```rust
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

static IS_REGISTERED: AtomicBool = AtomicBool::new(false);

/// Parse a hotkey string into Shortcut
/// Format: "CommandOrControl+Shift+Space"
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
            "space" => {
                key_code = Some(Code::Space);
            }
            "enter" | "return" => {
                key_code = Some(Code::Enter);
            }
            _ => {
                // Try to parse as a single character
                if part.len() == 1 {
                    let c = part.chars().next().unwrap().to_ascii_uppercase();
                    key_code = match c {
                        'A' => Some(Code::KeyA),
                        'B' => Some(Code::KeyB),
                        'C' => Some(Code::KeyC),
                        'D' => Some(Code::KeyD),
                        'E' => Some(Code::KeyE),
                        'F' => Some(Code::KeyF),
                        'G' => Some(Code::KeyG),
                        'H' => Some(Code::KeyH),
                        'I' => Some(Code::KeyI),
                        'J' => Some(Code::KeyJ),
                        'K' => Some(Code::KeyK),
                        'L' => Some(Code::KeyL),
                        'M' => Some(Code::KeyM),
                        'N' => Some(Code::KeyN),
                        'O' => Some(Code::KeyO),
                        'P' => Some(Code::KeyP),
                        'Q' => Some(Code::KeyQ),
                        'R' => Some(Code::KeyR),
                        'S' => Some(Code::KeyS),
                        'T' => Some(Code::KeyT),
                        'U' => Some(Code::KeyU),
                        'V' => Some(Code::KeyV),
                        'W' => Some(Code::KeyW),
                        'X' => Some(Code::KeyX),
                        'Y' => Some(Code::KeyY),
                        'Z' => Some(Code::KeyZ),
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

/// Register global hotkey
pub fn register_hotkey(app: &AppHandle, hotkey_str: &str) -> Result<(), String> {
    let shortcut = parse_hotkey(hotkey_str)?;
    
    // Unregister existing if any
    if IS_REGISTERED.load(Ordering::SeqCst) {
        let _ = app.global_shortcut().unregister_all();
        IS_REGISTERED.store(false, Ordering::SeqCst);
    }
    
    let app_handle = app.clone();
    
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                // Emit event to frontend
                let _ = app_handle.emit("hotkey_pressed", ());
            }
        })
        .map_err(|e| e.to_string())?;
    
    IS_REGISTERED.store(true, Ordering::SeqCst);
    
    Ok(())
}

/// Unregister all hotkeys
pub fn unregister_hotkeys(app: &AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;
    
    IS_REGISTERED.store(false, Ordering::SeqCst);
    
    Ok(())
}

/// Check if a hotkey is already in use by the system
pub fn is_hotkey_available(app: &AppHandle, hotkey_str: &str) -> Result<bool, String> {
    let shortcut = parse_hotkey(hotkey_str)?;
    
    // Try to register and immediately unregister
    match app.global_shortcut().register(shortcut.clone()) {
        Ok(_) => {
            let _ = app.global_shortcut().unregister(shortcut);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}
```

### Step 4: Create Hotkey Commands

**`src-tauri/src/commands/hotkey.rs`:**
```rust
use crate::hotkey::{register_hotkey, unregister_hotkeys, is_hotkey_available};
use tauri::AppHandle;

#[tauri::command]
pub fn set_global_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    register_hotkey(&app, &hotkey)
}

#[tauri::command]
pub fn clear_global_hotkey(app: AppHandle) -> Result<(), String> {
    unregister_hotkeys(&app)
}

#[tauri::command]
pub fn check_hotkey_available(app: AppHandle, hotkey: String) -> Result<bool, String> {
    is_hotkey_available(&app, &hotkey)
}
```

### Step 5: Update Commands Module

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;
pub mod hotkey;

pub use recording::*;
pub use transcription::*;
pub use hotkey::*;
```

---

## Day 18-19: Auto-Paste Implementation

### Step 1: Add Clipboard and Keyboard Dependencies

**Update `src-tauri/Cargo.toml`:**
```toml
[dependencies]
# ... existing dependencies ...
arboard = "3"
enigo = { version = "0.2", features = ["macos"] }
```

### Step 2: Create Clipboard Module

**`src-tauri/src/clipboard.rs`:**
```rust
use arboard::Clipboard;
use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

/// Paste text to the currently active application
/// 
/// This function:
/// 1. Saves current clipboard content
/// 2. Sets new text to clipboard
/// 3. Simulates Cmd+V keystroke
/// 4. Optionally restores previous clipboard content
pub fn paste_text(text: &str, restore_clipboard: bool) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    
    // Save previous clipboard content
    let previous_content = if restore_clipboard {
        clipboard.get_text().ok()
    } else {
        None
    };
    
    // Set new text to clipboard
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    
    // Small delay for clipboard to update
    thread::sleep(Duration::from_millis(50));
    
    // Simulate Cmd+V (paste)
    simulate_paste()?;
    
    // Restore previous clipboard content after a delay
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

/// Simulate Cmd+V keystroke on macOS
fn simulate_paste() -> Result<(), String> {
    let settings = Settings::default();
    let mut enigo = Enigo::new(&settings).map_err(|e| e.to_string())?;
    
    // Press Cmd+V
    enigo.key(Key::Meta, enigo::Direction::Press).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(10));
    enigo.key(Key::Unicode('v'), enigo::Direction::Click).map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(10));
    enigo.key(Key::Meta, enigo::Direction::Release).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Copy text to clipboard without pasting
pub fn copy_to_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())
}

/// Get current clipboard content
pub fn get_clipboard_content() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.get_text().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_copy_to_clipboard() {
        let result = copy_to_clipboard("test text");
        assert!(result.is_ok());
        
        let content = get_clipboard_content();
        assert!(content.is_ok());
        assert_eq!(content.unwrap(), "test text");
    }
}
```

### Step 3: Create Clipboard Commands

**`src-tauri/src/commands/clipboard.rs`:**
```rust
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
```

### Step 4: Update Commands Module

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;
pub mod hotkey;
pub mod clipboard;

pub use recording::*;
pub use transcription::*;
pub use hotkey::*;
pub use clipboard::*;
```

---

## Day 20-21: Floating Window Implementation

### Step 1: Create Floating Window Component

**`src/components/FloatingWindow.tsx`:**
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useRecordingStore } from '../stores/recordingStore';

export const FloatingWindow = () => {
  const { state, transcript } = useRecordingStore();

  if (state === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-black/90 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3">
            {state === 'recording' && (
              <>
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-white font-medium">Listening...</span>
              </>
            )}

            {state === 'processing' && (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white font-medium">Processing...</span>
              </>
            )}

            {state === 'done' && (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-white font-medium">Done!</span>
              </>
            )}
          </div>

          {transcript && state === 'done' && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-white/70 text-sm mt-3 max-w-md line-clamp-2"
            >
              {transcript}
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
```

### Step 2: Create Hotkey Hook

**`src/hooks/useTauriEvents.ts`:**
```typescript
import { useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setupListener = async () => {
      unlisten = await listen<T>(eventName, (event) => {
        handler(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, handler]);
}
```

**`src/hooks/useHotkey.ts`:**
```typescript
import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTauriEvent } from './useTauriEvents';
import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  startRecording,
  stopRecording,
  transcribeAndPolish,
} from '../lib/tauri';

export function useHotkey() {
  const { state, setState, setTranscript, setError, reset } = useRecordingStore();
  const { apiKey, language, shouldPolish, hotkey } = useSettingsStore();

  // Register hotkey on mount
  useEffect(() => {
    const registerHotkey = async () => {
      try {
        await invoke('set_global_hotkey', { hotkey });
        console.log('Hotkey registered:', hotkey);
      } catch (err) {
        console.error('Failed to register hotkey:', err);
      }
    };

    registerHotkey();

    return () => {
      invoke('clear_global_hotkey').catch(console.error);
    };
  }, [hotkey]);

  // Handle hotkey press
  const handleHotkeyPress = useCallback(async () => {
    if (state === 'processing') {
      // Ignore while processing
      return;
    }

    if (state === 'idle') {
      // Start recording
      if (!apiKey) {
        setError('Please configure your OpenAI API key');
        return;
      }

      try {
        await startRecording();
        setState('recording');
      } catch (err) {
        setError(err as string);
      }
    } else if (state === 'recording') {
      // Stop recording and process
      setState('processing');

      try {
        const audioData = await stopRecording();
        
        const result = await transcribeAndPolish(
          audioData,
          apiKey,
          language,
          shouldPolish
        );

        const finalText = result.polished_text || result.raw_text;
        setTranscript(finalText);

        // Auto-paste the text
        await invoke('paste', { text: finalText, restoreClipboard: true });

        setState('done');

        // Reset after delay
        setTimeout(() => {
          reset();
        }, 2000);
      } catch (err) {
        setError(err as string);
        setState('idle');
      }
    } else if (state === 'done') {
      // Reset immediately if pressing hotkey while showing "done"
      reset();
    }
  }, [state, apiKey, language, shouldPolish, setState, setTranscript, setError, reset]);

  // Listen for hotkey events from Tauri
  useTauriEvent('hotkey_pressed', handleHotkeyPress);

  return { handleHotkeyPress };
}
```

### Step 3: Update Settings Store with Hotkey

**Update `src/stores/settingsStore.ts`:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  apiKey: string;
  language: string;
  shouldPolish: boolean;
  hotkey: string;
  autoPaste: boolean;
  restoreClipboard: boolean;
  setApiKey: (key: string) => void;
  setLanguage: (lang: string) => void;
  setShouldPolish: (polish: boolean) => void;
  setHotkey: (hotkey: string) => void;
  setAutoPaste: (autoPaste: boolean) => void;
  setRestoreClipboard: (restore: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKey: '',
      language: 'en',
      shouldPolish: true,
      hotkey: 'CommandOrControl+Shift+Space',
      autoPaste: true,
      restoreClipboard: true,
      setApiKey: (apiKey) => set({ apiKey }),
      setLanguage: (language) => set({ language }),
      setShouldPolish: (shouldPolish) => set({ shouldPolish }),
      setHotkey: (hotkey) => set({ hotkey }),
      setAutoPaste: (autoPaste) => set({ autoPaste }),
      setRestoreClipboard: (restoreClipboard) => set({ restoreClipboard }),
    }),
    {
      name: 'voiceflow-settings',
    }
  )
);
```

### Step 4: Update Tauri API Wrapper

**Update `src/lib/tauri.ts`:**
```typescript
import { invoke } from '@tauri-apps/api/core';

// ... existing functions ...

// Hotkey functions
export async function setGlobalHotkey(hotkey: string): Promise<void> {
  return invoke('set_global_hotkey', { hotkey });
}

export async function clearGlobalHotkey(): Promise<void> {
  return invoke('clear_global_hotkey');
}

export async function checkHotkeyAvailable(hotkey: string): Promise<boolean> {
  return invoke('check_hotkey_available', { hotkey });
}

// Clipboard functions
export async function paste(text: string, restoreClipboard: boolean): Promise<void> {
  return invoke('paste', { text, restoreClipboard });
}

export async function copy(text: string): Promise<void> {
  return invoke('copy', { text });
}

export async function getClipboard(): Promise<string> {
  return invoke('get_clipboard');
}
```

### Step 5: Create Hotkey Settings Component

**`src/components/HotkeySettings.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { checkHotkeyAvailable, setGlobalHotkey } from '../lib/tauri';

const PRESET_HOTKEYS = [
  { label: 'Cmd+Shift+Space', value: 'CommandOrControl+Shift+Space' },
  { label: 'Cmd+Shift+D', value: 'CommandOrControl+Shift+D' },
  { label: 'Cmd+Option+Space', value: 'CommandOrControl+Alt+Space' },
  { label: 'F5', value: 'F5' },
];

export const HotkeySettings = () => {
  const { hotkey, setHotkey } = useSettingsStore();
  const [selectedHotkey, setSelectedHotkey] = useState(hotkey);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      setIsChecking(true);
      try {
        const available = await checkHotkeyAvailable(selectedHotkey);
        setIsAvailable(available);
      } catch (err) {
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, [selectedHotkey]);

  const handleSave = async () => {
    try {
      await setGlobalHotkey(selectedHotkey);
      setHotkey(selectedHotkey);
    } catch (err) {
      console.error('Failed to set hotkey:', err);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-700">
        Global Hotkey
      </label>

      <div className="space-y-2">
        {PRESET_HOTKEYS.map((preset) => (
          <label
            key={preset.value}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedHotkey === preset.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="hotkey"
              value={preset.value}
              checked={selectedHotkey === preset.value}
              onChange={(e) => setSelectedHotkey(e.target.value)}
              className="text-blue-500"
            />
            <span className="font-mono text-sm">{preset.label}</span>
          </label>
        ))}
      </div>

      {isChecking && (
        <p className="text-sm text-gray-500">Checking availability...</p>
      )}

      {!isChecking && isAvailable === false && (
        <p className="text-sm text-red-500">
          This hotkey is already in use by another application
        </p>
      )}

      {!isChecking && isAvailable === true && (
        <p className="text-sm text-green-500">Hotkey is available</p>
      )}

      <button
        onClick={handleSave}
        disabled={selectedHotkey === hotkey || isAvailable === false}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Hotkey
      </button>

      <p className="text-xs text-gray-500">
        Press the hotkey to start/stop recording from anywhere on your Mac
      </p>
    </div>
  );
};
```

### Step 6: Update Main App

**Update `src/App.tsx`:**
```tsx
import { RecordButton } from './components/RecordButton';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ApiKeyInput } from './components/ApiKeyInput';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { FloatingWindow } from './components/FloatingWindow';
import { HotkeySettings } from './components/HotkeySettings';
import { useRecordingStore } from './stores/recordingStore';
import { useSettingsStore } from './stores/settingsStore';
import { useHotkey } from './hooks/useHotkey';
import './styles/globals.css';

function App() {
  const { error } = useRecordingStore();
  const { shouldPolish, setShouldPolish, autoPaste, setAutoPaste } = useSettingsStore();

  // Initialize hotkey listener
  useHotkey();

  return (
    <>
      {/* Floating window for recording status */}
      <FloatingWindow />

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            VoiceFlow
          </h1>

          <div className="space-y-6">
            <ApiKeyInput />

            <MicrophoneSelector />

            <HotkeySettings />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="polish"
                  checked={shouldPolish}
                  onChange={(e) => setShouldPolish(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="polish" className="text-sm text-gray-700">
                  Polish text with AI
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoPaste"
                  checked={autoPaste}
                  onChange={(e) => setAutoPaste(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="autoPaste" className="text-sm text-gray-700">
                  Auto-paste transcribed text
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <RecordButton />
            </div>

            <TranscriptDisplay />

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
```

---

## Update Main.rs with All Commands

**Update `src-tauri/src/main.rs`:**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod api;
mod commands;
mod hotkey;
mod clipboard;

use commands::{
    // Recording
    get_default_microphone, get_microphones, is_recording, start_recording, stop_recording,
    RecorderState,
    // Transcription
    transcribe, polish, transcribe_and_polish,
    // Hotkey
    set_global_hotkey, clear_global_hotkey, check_hotkey_available,
    // Clipboard
    paste, copy, get_clipboard,
};
use audio::AudioRecorder;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(RecorderState(Mutex::new(AudioRecorder::new())))
        .invoke_handler(tauri::generate_handler![
            // Recording commands
            get_microphones,
            get_default_microphone,
            start_recording,
            stop_recording,
            is_recording,
            // API commands
            transcribe,
            polish,
            transcribe_and_polish,
            // Hotkey commands
            set_global_hotkey,
            clear_global_hotkey,
            check_hotkey_available,
            // Clipboard commands
            paste,
            copy,
            get_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## macOS Permissions

### Accessibility Permission

For auto-paste to work, the app needs accessibility permissions:

1. Go to **System Preferences > Security & Privacy > Privacy > Accessibility**
2. Add your app to the list
3. Enable the checkbox

### Info.plist Entries

**`src-tauri/Info.plist`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSMicrophoneUsageDescription</key>
    <string>VoiceFlow needs microphone access to transcribe your voice.</string>
    <key>NSAppleEventsUsageDescription</key>
    <string>VoiceFlow needs accessibility access to paste text into other applications.</string>
</dict>
</plist>
```

---

## Verification Checklist

Before moving to Phase 4, verify:

- [ ] Global hotkey registers successfully
- [ ] Pressing hotkey toggles recording state
- [ ] Hotkey works while app is in background
- [ ] Auto-paste inserts text into other apps (Safari, Notes, VS Code)
- [ ] Clipboard content is restored after paste
- [ ] Floating window appears during recording
- [ ] Floating window shows processing state
- [ ] Floating window disappears after completion
- [ ] Different hotkey presets work correctly

---

## Troubleshooting

### Common Issues

1. **Hotkey not working**
   - Check if another app is using the same hotkey
   - Try a different key combination
   - Restart the app

2. **Auto-paste not working**
   - Grant Accessibility permission in System Preferences
   - Try running with `sudo` for testing (not recommended for production)
   - Check if target app accepts paste

3. **Permission denied errors**
   - Open System Preferences > Security & Privacy
   - Add app to Accessibility and Microphone permissions
   - Restart the app after granting permissions

4. **Floating window not appearing**
   - Check if `state` is being updated correctly
   - Verify AnimatePresence is working
   - Check z-index of the window

---

## Next Steps

After completing Phase 3, proceed to [Phase 4: System Tray & Persistence](./PHASE_4_SYSTEM_TRAY.md)
