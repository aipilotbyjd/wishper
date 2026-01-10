# Wispr Flow Clone - Complete MVP Development Plan

> **Goal:** Build a Mac-only voice-to-text dictation app with AI polishing
> **Timeline:** 8 weeks to MVP
> **Tech Stack:** Tauri 2.0 + React + TypeScript + OpenAI APIs

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites & Setup](#2-prerequisites--setup)
3. [Tech Stack Deep Dive](#3-tech-stack-deep-dive)
4. [Architecture & System Design](#4-architecture--system-design)
5. [Database Schema](#5-database-schema)
6. [API Integrations](#6-api-integrations)
7. [Feature Specifications](#7-feature-specifications)
8. [File Structure](#8-file-structure)
9. [Step-by-Step Implementation Guide](#9-step-by-step-implementation-guide)
10. [AI Prompts for Development](#10-ai-prompts-for-development)
11. [Testing Strategy](#11-testing-strategy)
12. [Distribution & Deployment](#12-distribution--deployment)
13. [Cost Analysis](#13-cost-analysis)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Project Overview

### What We're Building

A macOS menu bar application that:
- Listens to voice input via global hotkey
- Transcribes speech to text using OpenAI Whisper
- Polishes text using GPT (removes filler words, adds punctuation)
- Auto-pastes the result into any active application

### Core User Flow

```
User presses Cmd+Shift+Space
        ↓
Floating window appears with "Listening..."
        ↓
User speaks naturally
        ↓
User presses hotkey again (or pauses)
        ↓
Audio sent to Whisper API
        ↓
Raw text sent to GPT for polishing
        ↓
Polished text auto-pasted to active app
        ↓
Floating window disappears
```

### MVP Feature Set

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Global Hotkey | `Cmd+Shift+Space` to toggle recording |
| P0 | Voice Recording | Capture audio from Mac microphone |
| P0 | Transcription | Convert speech to text via Whisper |
| P0 | Text Polishing | Clean up text via GPT |
| P0 | Auto-Paste | Insert text into active application |
| P0 | Menu Bar Icon | System tray with status indicator |
| P1 | Floating Window | Show live transcription status |
| P1 | History | View past dictations |
| P1 | Settings | Language, hotkey, microphone selection |
| P2 | Personal Dictionary | Custom words and names |
| P2 | Voice Snippets | Trigger saved text with voice commands |

---

## 2. Prerequisites & Setup

### Required Software

```bash
# 1. Install Xcode Command Line Tools
xcode-select --install

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 3. Verify Rust installation
rustc --version  # Should show 1.70+

# 4. Install Node.js 18+ (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 5. Install Tauri CLI
cargo install tauri-cli

# 6. Install pnpm (faster than npm/yarn)
npm install -g pnpm
```

### Required Accounts & API Keys

| Service | Purpose | Cost | Link |
|---------|---------|------|------|
| OpenAI | Whisper API + GPT | Pay-per-use | https://platform.openai.com |
| Apple Developer | App notarization | $99/year | https://developer.apple.com |
| GitHub | Version control | Free | https://github.com |

### Environment Variables

Create a `.env` file (never commit this):

```env
# OpenAI API
OPENAI_API_KEY=sk-your-key-here

# App Configuration
APP_NAME=VoiceFlow
APP_VERSION=0.1.0

# Feature Flags
ENABLE_HISTORY=true
ENABLE_SNIPPETS=false
```

---

## 3. Tech Stack Deep Dive

### Why Tauri 2.0?

| Aspect | Tauri | Electron | Native Swift |
|--------|-------|----------|--------------|
| Bundle Size | ~10MB | ~150MB | ~5MB |
| Memory Usage | Low | High | Lowest |
| Startup Time | Fast | Slow | Fastest |
| Web Tech UI | ✅ Yes | ✅ Yes | ❌ No |
| Cross-platform | ✅ Yes | ✅ Yes | ❌ No |
| Learning Curve | Medium | Low | High |

**Verdict:** Tauri gives us web tech flexibility with near-native performance.

### Frontend Stack

```
React 18          → UI components
TypeScript        → Type safety
Vite              → Fast bundling
TailwindCSS       → Styling
Zustand           → State management
React Query       → API state (optional)
Framer Motion     → Animations
```

### Backend Stack (Rust/Tauri)

```
Tauri 2.0         → App framework
tokio             → Async runtime
reqwest           → HTTP client for APIs
rodio             → Audio playback (optional)
cpal              → Audio capture
rusqlite          → Local database
serde             → JSON serialization
```

### External APIs

```
OpenAI Whisper    → Speech-to-text
OpenAI GPT-4o-mini→ Text polishing
```

---

## 4. Architecture & System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TAURI APPLICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 REACT FRONTEND                       │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │    │
│  │  │  Floating │ │  Settings │ │      History      │  │    │
│  │  │  Window   │ │   Panel   │ │       View        │  │    │
│  │  └─────┬─────┘ └─────┬─────┘ └─────────┬─────────┘  │    │
│  │        │             │                 │            │    │
│  │  ┌─────▼─────────────▼─────────────────▼─────────┐  │    │
│  │  │              State Management (Zustand)        │  │    │
│  │  └─────────────────────┬─────────────────────────┘  │    │
│  │                        │                            │    │
│  │  ┌─────────────────────▼─────────────────────────┐  │    │
│  │  │           Tauri IPC Bridge (@tauri-apps/api)   │  │    │
│  │  └─────────────────────┬─────────────────────────┘  │    │
│  └────────────────────────┼────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────┐    │
│  │                   RUST BACKEND                       │    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  │   Audio      │  │   Hotkey     │  │  Clipboard│  │    │
│  │  │   Capture    │  │   Manager    │  │  Manager  │  │    │
│  │  │   (cpal)     │  │  (global)    │  │           │  │    │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │    │
│  │         │                 │                │        │    │
│  │  ┌──────▼─────────────────▼────────────────▼─────┐  │    │
│  │  │              Command Handlers                  │  │    │
│  │  └──────────────────────┬────────────────────────┘  │    │
│  │                         │                           │    │
│  │  ┌──────────────────────▼────────────────────────┐  │    │
│  │  │              API Client Module                 │  │    │
│  │  │  ┌─────────────┐      ┌─────────────┐         │  │    │
│  │  │  │  Whisper    │      │    GPT      │         │  │    │
│  │  │  │  Client     │      │   Client    │         │  │    │
│  │  │  └─────────────┘      └─────────────┘         │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │            SQLite Database                     │  │    │
│  │  │  • Settings  • History  • Snippets  • Dict    │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │        EXTERNAL SERVICES       │
              │  ┌───────────┐ ┌───────────┐  │
              │  │  OpenAI   │ │  OpenAI   │  │
              │  │  Whisper  │ │   GPT     │  │
              │  └───────────┘ └───────────┘  │
              └───────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        DICTATION FLOW                             │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
  │  IDLE   │────▶│RECORDING│────▶│PROCESS- │────▶│ PASTING │
  │         │     │         │     │  ING    │     │         │
  └─────────┘     └─────────┘     └─────────┘     └─────────┘
       │               │               │               │
       │               │               │               │
       ▼               ▼               ▼               ▼
  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
  │ Menu bar│     │ Floating│     │ Loading │     │ Success │
  │ icon:   │     │ window: │     │ spinner │     │ notifi- │
  │ gray    │     │ "🎤"    │     │ shown   │     │ cation  │
  └─────────┘     └─────────┘     └─────────┘     └─────────┘

  Triggers:
  • IDLE → RECORDING:     User presses Cmd+Shift+Space
  • RECORDING → PROCESS:  User presses hotkey again OR 2s silence
  • PROCESSING → PASTING: API calls complete
  • PASTING → IDLE:       Text inserted successfully
```

### IPC Communication

```
┌─────────────────────────────────────────────────────────────┐
│                  TAURI IPC COMMANDS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend → Backend (Commands)                               │
│  ─────────────────────────────                               │
│  • start_recording()      → Begin audio capture              │
│  • stop_recording()       → End capture, return audio        │
│  • transcribe(audio)      → Send to Whisper, get text        │
│  • polish_text(text)      → Send to GPT, get polished        │
│  • paste_text(text)       → Insert into active app           │
│  • get_settings()         → Retrieve user settings           │
│  • save_settings(data)    → Persist settings                 │
│  • get_history()          → Retrieve dictation history       │
│  • save_to_history(item)  → Save new dictation               │
│  • get_microphones()      → List available input devices     │
│                                                              │
│  Backend → Frontend (Events)                                 │
│  ───────────────────────────                                 │
│  • hotkey_pressed         → Global shortcut triggered        │
│  • recording_started      → Audio capture began              │
│  • recording_stopped      → Audio capture ended              │
│  • transcription_complete → Whisper returned text            │
│  • polishing_complete     → GPT returned polished text       │
│  • paste_complete         → Text inserted successfully       │
│  • error_occurred         → Something went wrong             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### SQLite Schema

```sql
-- Settings table (key-value store)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO settings (key, value) VALUES
    ('language', 'en'),
    ('hotkey', 'CommandOrControl+Shift+Space'),
    ('auto_paste', 'true'),
    ('polish_text', 'true'),
    ('theme', 'system'),
    ('microphone_id', 'default'),
    ('show_floating_window', 'true');

-- History table
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text TEXT NOT NULL,
    polished_text TEXT,
    duration_seconds REAL,
    word_count INTEGER,
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_history_created_at ON history(created_at DESC);

-- Personal dictionary
CREATE TABLE dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    pronunciation TEXT,  -- Optional: how to pronounce
    category TEXT,       -- e.g., 'name', 'technical', 'acronym'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Voice snippets
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_phrase TEXT NOT NULL UNIQUE,  -- e.g., "insert signature"
    content TEXT NOT NULL,                 -- The text to insert
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage statistics
CREATE TABLE usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_dictations INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    total_duration_seconds REAL DEFAULT 0
);
```

### TypeScript Types

```typescript
// src/types/database.types.ts

export interface Settings {
  language: string;
  hotkey: string;
  autoPaste: boolean;
  polishText: boolean;
  theme: 'light' | 'dark' | 'system';
  microphoneId: string;
  showFloatingWindow: boolean;
}

export interface HistoryItem {
  id: number;
  rawText: string;
  polishedText: string | null;
  durationSeconds: number;
  wordCount: number;
  language: string;
  createdAt: string;
}

export interface DictionaryWord {
  id: number;
  word: string;
  pronunciation?: string;
  category?: 'name' | 'technical' | 'acronym' | 'other';
  createdAt: string;
}

export interface Snippet {
  id: number;
  triggerPhrase: string;
  content: string;
  useCount: number;
  createdAt: string;
}

export interface UsageStats {
  date: string;
  totalDictations: number;
  totalWords: number;
  totalDurationSeconds: number;
}
```

---

## 6. API Integrations

### OpenAI Whisper API

**Endpoint:** `POST https://api.openai.com/v1/audio/transcriptions`

**Request:**
```bash
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@audio.wav" \
  -F model="whisper-1" \
  -F language="en" \
  -F response_format="json"
```

**Response:**
```json
{
  "text": "Hello, this is a test recording with some um filler words."
}
```

**Rust Implementation:**
```rust
// src-tauri/src/api/whisper.rs

use reqwest::multipart;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct WhisperResponse {
    pub text: String,
}

pub async fn transcribe_audio(
    audio_data: Vec<u8>,
    api_key: &str,
    language: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let part = multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    
    let form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("language", language.to_string())
        .text("response_format", "json");
    
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;
    
    let result: WhisperResponse = response.json().await?;
    Ok(result.text)
}
```

### OpenAI GPT API (Text Polishing)

**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**System Prompt for Polishing:**
```
You are a text polishing assistant. Your job is to clean up voice-transcribed text.

Rules:
1. Remove filler words: um, uh, like, you know, basically, actually, literally, so, well
2. Remove false starts and repetitions
3. Add proper punctuation (periods, commas, question marks)
4. Fix obvious grammar mistakes
5. Maintain the original meaning and tone
6. Keep the text natural, don't make it overly formal
7. Preserve technical terms, names, and specific vocabulary
8. Format lists if the speaker clearly intends a list
9. Return ONLY the polished text, no explanations

Example:
Input: "so um I was thinking that we could like maybe have a meeting tomorrow um at like 3 pm or something"
Output: "I was thinking we could have a meeting tomorrow at 3 PM."
```

**Rust Implementation:**
```rust
// src-tauri/src/api/gpt.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
}

#[derive(Deserialize)]
struct ChatMessageResponse {
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

const SYSTEM_PROMPT: &str = r#"You are a text polishing assistant. Clean up voice-transcribed text by:
1. Removing filler words (um, uh, like, you know, basically, actually)
2. Removing false starts and repetitions
3. Adding proper punctuation
4. Fixing obvious grammar mistakes
5. Maintaining original meaning and tone
6. Keeping text natural, not overly formal
Return ONLY the polished text."#;

pub async fn polish_text(
    raw_text: &str,
    api_key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = Client::new();
    
    let request = ChatRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: raw_text.to_string(),
            },
        ],
        temperature: 0.3,
        max_tokens: 2048,
    };
    
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await?;
    
    let result: ChatResponse = response.json().await?;
    Ok(result.choices[0].message.content.clone())
}
```

### API Error Handling

```rust
// src-tauri/src/api/errors.rs

use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("API rate limit exceeded")]
    RateLimitExceeded,
    
    #[error("Invalid API key")]
    InvalidApiKey,
    
    #[error("Audio too long (max 25MB)")]
    AudioTooLong,
    
    #[error("Transcription failed: {0}")]
    TranscriptionFailed(String),
    
    #[error("Polishing failed: {0}")]
    PolishingFailed(String),
}

impl From<ApiError> for String {
    fn from(error: ApiError) -> Self {
        error.to_string()
    }
}
```

---

## 7. Feature Specifications

### 7.1 Global Hotkey

**Default:** `Cmd+Shift+Space`

**Behavior:**
- First press: Start recording
- Second press: Stop recording and process
- While processing: Ignored (show loading state)

**Implementation:**
```rust
// src-tauri/src/hotkey.rs

use tauri::{AppHandle, GlobalShortcutManager};

pub fn register_global_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let mut shortcut_manager = app.global_shortcut_manager();
    
    // Unregister existing
    let _ = shortcut_manager.unregister_all();
    
    // Register new hotkey
    shortcut_manager
        .register(hotkey, move || {
            // Emit event to frontend
            app.emit_all("hotkey_pressed", ()).unwrap();
        })
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 7.2 Audio Recording

**Format:** WAV (16-bit PCM, 16kHz mono)
**Max Duration:** 5 minutes (configurable)
**Silence Detection:** Stop after 2 seconds of silence

**Implementation:**
```rust
// src-tauri/src/audio.rs

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};

pub struct AudioRecorder {
    is_recording: Arc<Mutex<bool>>,
    audio_buffer: Arc<Mutex<Vec<f32>>>,
}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    pub fn start_recording(&self) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No input device available")?;
        
        let config = cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(16000),
            buffer_size: cpal::BufferSize::Default,
        };
        
        *self.is_recording.lock().unwrap() = true;
        let buffer = self.audio_buffer.clone();
        let is_recording = self.is_recording.clone();
        
        let stream = device
            .build_input_stream(
                &config,
                move |data: &[f32], _| {
                    if *is_recording.lock().unwrap() {
                        buffer.lock().unwrap().extend_from_slice(data);
                    }
                },
                |err| eprintln!("Audio error: {}", err),
                None,
            )
            .map_err(|e| e.to_string())?;
        
        stream.play().map_err(|e| e.to_string())?;
        Ok(())
    }
    
    pub fn stop_recording(&self) -> Vec<u8> {
        *self.is_recording.lock().unwrap() = false;
        let samples = self.audio_buffer.lock().unwrap().clone();
        self.audio_buffer.lock().unwrap().clear();
        
        // Convert to WAV bytes
        self.samples_to_wav(&samples)
    }
    
    fn samples_to_wav(&self, samples: &[f32]) -> Vec<u8> {
        // WAV header + PCM data
        // Implementation details...
        vec![]
    }
}
```

### 7.3 Floating Window

**Behavior:**
- Appears when recording starts
- Shows current state: "Listening...", "Processing...", "Done!"
- Optional: Live waveform visualization
- Disappears after text is pasted

**React Component:**
```tsx
// src/components/FloatingWindow.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useRecordingStore } from '../stores/recordingStore';

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

export const FloatingWindow = () => {
  const { state, transcript } = useRecordingStore();
  
  if (state === 'idle') return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 
                   bg-black/90 backdrop-blur-lg rounded-2xl 
                   px-6 py-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          {state === 'recording' && (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white">Listening...</span>
            </>
          )}
          
          {state === 'processing' && (
            <>
              <div className="w-5 h-5 border-2 border-white/30 
                            border-t-white rounded-full animate-spin" />
              <span className="text-white">Processing...</span>
            </>
          )}
          
          {state === 'done' && (
            <>
              <div className="w-5 h-5 text-green-500">✓</div>
              <span className="text-white">Done!</span>
            </>
          )}
        </div>
        
        {transcript && (
          <p className="text-white/70 text-sm mt-2 max-w-md truncate">
            {transcript}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
```

### 7.4 System Tray

**Icon States:**
- Gray: Idle
- Blue: Recording
- Yellow: Processing
- Green (flash): Success

**Menu Items:**
- Start/Stop Recording
- Open Settings
- View History
- ---
- Check for Updates
- About
- Quit

**Implementation:**
```rust
// src-tauri/src/tray.rs

use tauri::{
    AppHandle, CustomMenuItem, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem,
};

pub fn create_tray() -> SystemTray {
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("toggle", "Start Recording"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("settings", "Settings..."))
        .add_item(CustomMenuItem::new("history", "History"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "Quit"));
    
    SystemTray::new().with_menu(menu)
}

pub fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "toggle" => {
                app.emit_all("toggle_recording", ()).unwrap();
            }
            "settings" => {
                // Open settings window
            }
            "history" => {
                // Open history window
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        _ => {}
    }
}
```

### 7.5 Auto-Paste

**Mechanism:** 
1. Copy text to clipboard
2. Simulate Cmd+V keystroke
3. Restore previous clipboard content (optional)

**Implementation:**
```rust
// src-tauri/src/clipboard.rs

use arboard::Clipboard;
use enigo::{Enigo, Key, KeyboardControllable};
use std::thread;
use std::time::Duration;

pub fn paste_text(text: &str) -> Result<(), String> {
    // Save current clipboard content
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let previous_content = clipboard.get_text().ok();
    
    // Set new content
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    
    // Small delay for clipboard to update
    thread::sleep(Duration::from_millis(50));
    
    // Simulate Cmd+V
    let mut enigo = Enigo::new();
    enigo.key_down(Key::Meta);
    enigo.key_click(Key::Layout('v'));
    enigo.key_up(Key::Meta);
    
    // Optionally restore previous clipboard content
    if let Some(prev) = previous_content {
        thread::sleep(Duration::from_millis(100));
        let _ = clipboard.set_text(&prev);
    }
    
    Ok(())
}
```

---

## 8. File Structure

```
wispr-clone/
├── .github/
│   └── workflows/
│       ├── build.yml           # CI build
│       └── release.yml         # Release automation
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── lib.rs              # Library exports
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── recording.rs    # Start/stop recording
│   │   │   ├── transcription.rs# Whisper API calls
│   │   │   ├── polishing.rs    # GPT API calls
│   │   │   ├── clipboard.rs    # Paste operations
│   │   │   ├── settings.rs     # Settings CRUD
│   │   │   └── history.rs      # History CRUD
│   │   ├── audio/
│   │   │   ├── mod.rs
│   │   │   ├── recorder.rs     # Audio capture
│   │   │   └── wav.rs          # WAV encoding
│   │   ├── api/
│   │   │   ├── mod.rs
│   │   │   ├── whisper.rs      # Whisper client
│   │   │   ├── gpt.rs          # GPT client
│   │   │   └── errors.rs       # API error types
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs       # SQLite schema
│   │   │   └── migrations.rs   # DB migrations
│   │   ├── tray.rs             # System tray
│   │   └── hotkey.rs           # Global shortcuts
│   ├── icons/                  # App icons
│   │   ├── icon.icns           # macOS icon
│   │   ├── icon.png
│   │   └── tray/
│   │       ├── idle.png
│   │       ├── recording.png
│   │       └── processing.png
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Tauri config
│   └── build.rs                # Build script
├── src/
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # React entry
│   ├── components/
│   │   ├── FloatingWindow.tsx
│   │   ├── Settings/
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── HotkeySettings.tsx
│   │   │   └── LanguageSettings.tsx
│   │   ├── History/
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── HistoryItem.tsx
│   │   │   └── HistorySearch.tsx
│   │   ├── Dictionary/
│   │   │   ├── DictionaryPanel.tsx
│   │   │   └── DictionaryWord.tsx
│   │   └── Snippets/
│   │       ├── SnippetsPanel.tsx
│   │       └── SnippetItem.tsx
│   ├── hooks/
│   │   ├── useTauriEvents.ts   # Listen to Tauri events
│   │   ├── useRecording.ts     # Recording state
│   │   ├── useSettings.ts      # Settings hook
│   │   └── useHistory.ts       # History hook
│   ├── stores/
│   │   ├── recordingStore.ts   # Zustand store
│   │   └── settingsStore.ts
│   ├── lib/
│   │   ├── tauri.ts            # Tauri API wrappers
│   │   └── utils.ts            # Utility functions
│   ├── types/
│   │   ├── database.types.ts
│   │   └── app.types.ts
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example
├── .gitignore
└── README.md
```

---

## 9. Step-by-Step Implementation Guide

### Week 1: Project Setup & Basic Recording

#### Day 1-2: Initialize Project

```bash
# Create new Tauri project
pnpm create tauri-app wispr-clone --template react-ts

cd wispr-clone

# Install frontend dependencies
pnpm add zustand framer-motion @tauri-apps/api
pnpm add -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Install Rust dependencies (add to Cargo.toml)
```

**Update `src-tauri/Cargo.toml`:**
```toml
[package]
name = "wispr-clone"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["shell-open", "global-shortcut"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "multipart"] }
cpal = "0.15"
hound = "3.5"  # WAV encoding
rusqlite = { version = "0.29", features = ["bundled"] }
arboard = "3"  # Clipboard
enigo = "0.1"  # Keyboard simulation
thiserror = "1"
```

#### Day 3-4: Audio Recording

**AI Prompt to use:**
```
Create a Rust module for audio recording using cpal that:
1. Lists available input devices
2. Records audio from selected device
3. Outputs 16-bit PCM WAV at 16kHz mono
4. Has start/stop controls
5. Returns audio as Vec<u8>
Include proper error handling with thiserror.
```

#### Day 5-7: Tauri Commands & Basic UI

**AI Prompt to use:**
```
Create Tauri commands for:
1. start_recording() - begins audio capture
2. stop_recording() - stops and returns audio bytes
3. get_microphones() - lists available input devices

Then create a React component with:
- Record button (toggle)
- Microphone selector dropdown
- Recording state indicator
Use Zustand for state management.
```

---

### Week 2: API Integration

#### Day 8-10: Whisper Integration

**AI Prompt to use:**
```
Create a Rust module to call OpenAI Whisper API:
1. Accepts WAV audio bytes
2. Sends multipart form request
3. Handles rate limits and errors
4. Returns transcribed text
5. Supports language parameter

Create Tauri command: transcribe_audio(audio: Vec<u8>, language: String)
```

#### Day 11-14: GPT Polishing

**AI Prompt to use:**
```
Create a Rust module to call OpenAI GPT API for text polishing:
1. System prompt that removes filler words and adds punctuation
2. Uses gpt-4o-mini model
3. Temperature 0.3 for consistency
4. Returns polished text

Create Tauri command: polish_text(raw_text: String)

System prompt should:
- Remove: um, uh, like, you know, basically, actually
- Add proper punctuation
- Fix grammar
- Keep tone natural
```

---

### Week 3: Core Features

#### Day 15-17: Global Hotkey

**AI Prompt to use:**
```
Implement global hotkey in Tauri 2.0:
1. Default: Cmd+Shift+Space on Mac
2. Toggle recording on press
3. Emit events to frontend
4. Store custom hotkey in settings
5. Re-register when hotkey changes

Include macOS permission handling for accessibility.
```

#### Day 18-21: Auto-Paste & Floating Window

**AI Prompt to use:**
```
Implement auto-paste for macOS:
1. Copy polished text to clipboard
2. Simulate Cmd+V keystroke using enigo
3. Optionally restore previous clipboard
4. Handle accessibility permissions

Create floating window React component:
- Shows at bottom center of screen
- States: recording (red pulse), processing (spinner), done (checkmark)
- Shows truncated transcript
- Animates in/out with framer-motion
- Transparent background with blur
```

---

### Week 4: System Tray & Persistence

#### Day 22-24: System Tray

**AI Prompt to use:**
```
Create macOS system tray for Tauri app:
1. Menu items: Toggle Recording, Settings, History, Quit
2. Different icons for states: idle, recording, processing
3. Update icon based on app state
4. Handle menu item clicks
5. Show recording status in menu title
```

#### Day 25-28: SQLite Database

**AI Prompt to use:**
```
Set up SQLite database with rusqlite:
1. Create tables: settings, history, dictionary, snippets
2. Implement migrations system
3. Create CRUD functions for each table
4. Initialize database on app start
5. Store in macOS Application Support directory

Create Tauri commands:
- get_settings / save_settings
- get_history / add_history / delete_history
- get_dictionary / add_word / remove_word
```

---

### Week 5: Settings & History UI

#### Day 29-31: Settings Panel

**AI Prompt to use:**
```
Create Settings React component with tabs:
1. General: Language, theme, auto-paste toggle
2. Hotkey: Current hotkey display, change button, conflict detection
3. Audio: Microphone selector, test recording
4. About: Version, check updates, credits

Use Tailwind for styling, match macOS design language.
Store settings via Tauri commands.
```

#### Day 32-35: History Panel

**AI Prompt to use:**
```
Create History panel React component:
1. List of past dictations with date, preview, word count
2. Click to expand full text
3. Copy button for each item
4. Delete individual items
5. Search/filter functionality
6. Pagination or virtual scroll for performance

Fetch from SQLite via Tauri commands.
```

---

### Week 6: Advanced Features

#### Day 36-38: Personal Dictionary

**AI Prompt to use:**
```
Implement personal dictionary feature:
1. UI to add/remove custom words
2. Categories: names, technical terms, acronyms
3. Send dictionary words with Whisper prompt parameter
4. Import/export dictionary as JSON

Modify Whisper API call to include custom vocabulary hint.
```

#### Day 39-42: Voice Snippets

**AI Prompt to use:**
```
Implement voice snippets:
1. UI to create snippets: trigger phrase + content
2. After transcription, check for trigger phrases
3. Replace trigger with snippet content
4. Track usage count
5. Suggest popular snippets

Examples:
- "insert signature" → full email signature
- "my address" → physical address
- "standard greeting" → "Hi, I hope this email finds you well."
```

---

### Week 7: Polish & Edge Cases

#### Day 43-45: Error Handling & Offline State

**AI Prompt to use:**
```
Implement comprehensive error handling:
1. Network errors: show retry option
2. API rate limits: queue and retry with backoff
3. Audio permission denied: guide to System Preferences
4. Microphone not found: helpful error message
5. API key invalid: prompt to update in settings

Show toast notifications for errors.
Add offline detection and graceful degradation.
```

#### Day 46-49: Performance & Polish

**AI Prompt to use:**
```
Optimize app performance:
1. Lazy load settings and history panels
2. Debounce database writes
3. Optimize audio buffer handling
4. Add loading states everywhere
5. Smooth animations (60fps)
6. Memory cleanup on recording stop

Add polish:
- Keyboard navigation
- Focus management
- Screen reader support
- Reduce motion option
```

---

### Week 8: Distribution

#### Day 50-52: Build & Signing

**AI Prompt to use:**
```
Set up macOS app distribution:
1. Configure tauri.conf.json for production
2. Set up code signing with Apple Developer certificate
3. Configure entitlements for:
   - Microphone access
   - Accessibility (for paste simulation)
4. Create DMG installer with drag-to-Applications
5. Add auto-update with tauri-plugin-updater
```

#### Day 53-56: Notarization & Release

**AI Prompt to use:**
```
Set up Apple notarization:
1. Create App Store Connect API key
2. Configure notarytool in build script
3. Staple notarization ticket to app
4. Test Gatekeeper acceptance
5. Create GitHub release workflow

Set up update server:
1. Host update JSON on GitHub releases
2. Configure app to check for updates
3. Show update available notification
```

---

## 10. AI Prompts for Development

### For Code Generation

Use these prompts with Claude, GPT-4, or similar:

#### Initial Setup
```
I'm building a macOS voice-to-text app using Tauri 2.0 + React + TypeScript.
The app should:
- Record voice via global hotkey (Cmd+Shift+Space)
- Transcribe using OpenAI Whisper API
- Polish text using GPT-4o-mini (remove filler words, add punctuation)
- Auto-paste into active application

Generate the initial project structure with:
1. Tauri Rust backend with audio capture, API clients, clipboard handling
2. React frontend with Zustand state management
3. SQLite database for settings and history

Include all necessary Cargo.toml and package.json dependencies.
```

#### Specific Features
```
Generate a [FEATURE] implementation for my Tauri + React app.

Context:
- Using Tauri 2.0 with Rust backend
- React 18 with TypeScript and Zustand
- SQLite for persistence
- TailwindCSS for styling

Requirements:
[LIST SPECIFIC REQUIREMENTS]

Include:
- Rust backend code with Tauri commands
- React component with TypeScript types
- Zustand store updates if needed
- Error handling
```

#### Debugging
```
I'm getting this error in my Tauri app:
[PASTE ERROR]

Relevant code:
[PASTE CODE]

What's causing this and how do I fix it?
```

### For Documentation

```
Generate user documentation for my voice dictation app:
1. Getting started guide
2. Keyboard shortcuts reference
3. Troubleshooting common issues
4. Privacy policy template

The app records voice, sends to OpenAI for transcription, and pastes text.
```

---

## 11. Testing Strategy

### Unit Tests (Rust)

```rust
// src-tauri/src/audio/tests.rs

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_wav_encoding() {
        let samples = vec![0.0f32; 16000]; // 1 second of silence
        let wav = encode_wav(&samples, 16000);
        
        assert!(wav.len() > 44); // WAV header is 44 bytes
        assert_eq!(&wav[0..4], b"RIFF");
    }
    
    #[test]
    fn test_silence_detection() {
        let silent = vec![0.001f32; 1000];
        let loud = vec![0.5f32; 1000];
        
        assert!(is_silence(&silent, 0.01));
        assert!(!is_silence(&loud, 0.01));
    }
}
```

### Integration Tests

```rust
// src-tauri/tests/integration.rs

#[tokio::test]
async fn test_whisper_api() {
    let audio = include_bytes!("fixtures/test_audio.wav");
    let result = transcribe_audio(audio.to_vec(), "test_key", "en").await;
    
    // Note: Requires valid API key
    assert!(result.is_ok());
}
```

### E2E Tests (React)

```typescript
// src/__tests__/App.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

test('shows recording state when hotkey pressed', async () => {
    render(<App />);
    
    // Simulate hotkey event
    window.dispatchEvent(new CustomEvent('hotkey_pressed'));
    
    expect(screen.getByText('Listening...')).toBeInTheDocument();
});
```

### Manual Testing Checklist

```markdown
## Pre-Release Checklist

### Core Functionality
- [ ] Global hotkey starts/stops recording
- [ ] Audio is captured correctly
- [ ] Transcription returns accurate text
- [ ] Polishing removes filler words
- [ ] Auto-paste works in: Safari, Chrome, VS Code, Slack, Notes
- [ ] Clipboard is optionally restored

### UI/UX
- [ ] Floating window appears/disappears smoothly
- [ ] System tray icon reflects current state
- [ ] Settings save and persist
- [ ] History displays correctly
- [ ] Dark mode works

### Error Handling
- [ ] No internet: shows helpful error
- [ ] Invalid API key: prompts to update
- [ ] Mic permission denied: guides to settings
- [ ] API rate limit: retries gracefully

### Performance
- [ ] App starts in < 2 seconds
- [ ] Recording starts in < 100ms
- [ ] No memory leaks after 10 recordings
- [ ] CPU usage < 5% when idle

### macOS Specific
- [ ] Gatekeeper accepts app
- [ ] Accessibility permission prompt works
- [ ] Microphone permission prompt works
- [ ] Auto-update works
- [ ] DMG installer works
```

---

## 12. Distribution & Deployment

### Build Configuration

**`src-tauri/tauri.conf.json`:**
```json
{
  "productName": "VoiceFlow",
  "version": "0.1.0",
  "identifier": "com.yourcompany.voiceflow",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "macOSPrivateApi": true,
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.openai.com"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": ["icons/icon.icns"],
    "macOS": {
      "entitlements": "entitlements.plist",
      "minimumSystemVersion": "10.15",
      "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
      "hardRuntime": true
    }
  }
}
```

**`src-tauri/entitlements.plist`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
</dict>
</plist>
```

### GitHub Actions Release Workflow

**`.github/workflows/release.yml`:**
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        
      - name: Install pnpm
        run: npm install -g pnpm
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Import certificates
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
          security create-keychain -p actions build.keychain
          security import certificate.p12 -k build.keychain -P $APPLE_CERTIFICATE_PASSWORD -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k actions build.keychain
          
      - name: Build and sign
        env:
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          pnpm tauri build
          
      - name: Notarize
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          xcrun notarytool submit src-tauri/target/release/bundle/dmg/*.dmg \
            --apple-id $APPLE_ID \
            --password $APPLE_PASSWORD \
            --team-id $APPLE_TEAM_ID \
            --wait
          xcrun stapler staple src-tauri/target/release/bundle/dmg/*.dmg
          
      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: src-tauri/target/release/bundle/dmg/*.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Update Server

**`update.json` (host on your server or GitHub Pages):**
```json
{
  "version": "0.1.0",
  "notes": "Initial release",
  "pub_date": "2024-01-15T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/you/voiceflow/releases/download/v0.1.0/VoiceFlow_0.1.0_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/you/voiceflow/releases/download/v0.1.0/VoiceFlow_0.1.0_aarch64.dmg"
    }
  }
}
```

---

## 13. Cost Analysis

### Development Costs

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Account | $99/year | Required for notarization |
| OpenAI API (dev) | ~$20/month | Development and testing |
| Domain (optional) | ~$12/year | For website/updates |
| **Total Year 1** | **~$350** | |

### Per-User Operating Costs

| Usage Level | Whisper | GPT | Total/Month |
|-------------|---------|-----|-------------|
| Light (30 min) | $0.18 | $0.05 | $0.23 |
| Medium (2 hr) | $0.72 | $0.20 | $0.92 |
| Heavy (8 hr) | $2.88 | $0.80 | $3.68 |
| Power (20 hr) | $7.20 | $2.00 | $9.20 |

### Pricing Strategy Options

**Option A: Subscription**
- Free: 30 min/month
- Pro: $9.99/month (unlimited)

**Option B: Usage-Based**
- Free: 1 hour/month
- Pay-as-you-go: $0.05/minute

**Option C: One-Time Purchase**
- $49.99 one-time
- User provides own API key

---

## 14. Future Enhancements

### Post-MVP Features

| Feature | Complexity | Impact |
|---------|------------|--------|
| Offline mode (local Whisper) | High | High |
| iOS companion app | High | Medium |
| Browser extension | Medium | Medium |
| Team/enterprise features | High | High |
| Custom AI models | High | Medium |
| Voice commands ("delete that") | Medium | High |
| Real-time streaming transcription | High | High |
| Multiple language detection | Low | Medium |
| Export to various formats | Low | Low |
| Integrations (Notion, Slack) | Medium | Medium |

### Technical Improvements

- [ ] WebSocket streaming for real-time transcription
- [ ] Local Whisper model option (whisper.cpp)
- [ ] Audio compression before upload
- [ ] Caching for repeated phrases
- [ ] Analytics and usage tracking
- [ ] A/B testing framework
- [ ] Crash reporting (Sentry)

---

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/you/wispr-clone.git
cd wispr-clone
pnpm install

# Development
pnpm tauri dev

# Build for production
pnpm tauri build

# Run tests
cargo test
pnpm test
```

---

## Resources & References

- [Tauri 2.0 Documentation](https://v2.tauri.app)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Chat API](https://platform.openai.com/docs/guides/chat)
- [cpal Audio Library](https://docs.rs/cpal)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Zustand State Management](https://zustand-demo.pmnd.rs)

---

**Good luck building your Wispr Flow clone! 🎤**
