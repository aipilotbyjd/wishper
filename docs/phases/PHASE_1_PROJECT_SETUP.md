# Phase 1: Project Setup & Basic Recording (Week 1)

> **Duration:** Days 1-7
> **Goal:** Initialize project structure and implement basic audio recording

---

## Day 1-2: Initialize Project

### Step 1: Create Tauri Project

```bash
# Create new Tauri project
pnpm create tauri-app wispr-clone --template react-ts

cd wispr-clone
```

### Step 2: Install Frontend Dependencies

```bash
# Core dependencies
pnpm add zustand framer-motion @tauri-apps/api

# Styling
pnpm add -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

### Step 3: Configure Tailwind

**`tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**`src/styles/globals.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles for macOS-like appearance */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

### Step 4: Update Rust Dependencies

**`src-tauri/Cargo.toml`:**
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
hound = "3.5"
rusqlite = { version = "0.29", features = ["bundled"] }
arboard = "3"
enigo = "0.1"
thiserror = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

---

## Day 3-4: Audio Recording Module

### Step 1: Create Audio Module Structure

Create the following files in `src-tauri/src/`:

**`src-tauri/src/audio/mod.rs`:**
```rust
pub mod recorder;
pub mod wav;

pub use recorder::AudioRecorder;
pub use wav::encode_wav;
```

**`src-tauri/src/audio/recorder.rs`:**
```rust
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::thread;

pub struct AudioRecorder {
    is_recording: Arc<Mutex<bool>>,
    audio_buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            sample_rate: 16000,
        }
    }

    /// List all available input devices
    pub fn list_devices() -> Result<Vec<String>, String> {
        let host = cpal::default_host();
        let devices: Vec<String> = host
            .input_devices()
            .map_err(|e| e.to_string())?
            .filter_map(|d| d.name().ok())
            .collect();
        Ok(devices)
    }

    /// Get the default input device name
    pub fn default_device_name() -> Result<String, String> {
        let host = cpal::default_host();
        host.default_input_device()
            .ok_or("No default input device".to_string())?
            .name()
            .map_err(|e| e.to_string())
    }

    /// Start recording audio
    pub fn start_recording(&self) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No input device available")?;

        // Get supported config
        let supported_config = device
            .supported_input_configs()
            .map_err(|e| e.to_string())?
            .find(|c| c.channels() == 1)
            .ok_or("No mono input config found")?
            .with_sample_rate(cpal::SampleRate(self.sample_rate));

        let config = supported_config.into();

        // Clear previous buffer and set recording flag
        self.audio_buffer.lock().unwrap().clear();
        *self.is_recording.lock().unwrap() = true;

        let buffer = self.audio_buffer.clone();
        let is_recording = self.is_recording.clone();

        // Build input stream
        let stream = device
            .build_input_stream(
                &config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if *is_recording.lock().unwrap() {
                        buffer.lock().unwrap().extend_from_slice(data);
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
            .map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;

        // Keep stream alive in separate thread
        thread::spawn(move || {
            // Stream stays alive as long as this thread runs
            loop {
                thread::sleep(std::time::Duration::from_millis(100));
            }
        });

        Ok(())
    }

    /// Stop recording and return audio samples
    pub fn stop_recording(&self) -> Vec<f32> {
        *self.is_recording.lock().unwrap() = false;
        let samples = self.audio_buffer.lock().unwrap().clone();
        self.audio_buffer.lock().unwrap().clear();
        samples
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    /// Get the sample rate
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

impl Default for AudioRecorder {
    fn default() -> Self {
        Self::new()
    }
}
```

**`src-tauri/src/audio/wav.rs`:**
```rust
use hound::{WavSpec, WavWriter};
use std::io::Cursor;

/// Encode f32 samples to WAV bytes (16-bit PCM)
pub fn encode_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut buffer = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut buffer, spec).map_err(|e| e.to_string())?;

        for &sample in samples {
            // Convert f32 [-1.0, 1.0] to i16
            let sample_i16 = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
            writer.write_sample(sample_i16).map_err(|e| e.to_string())?;
        }

        writer.finalize().map_err(|e| e.to_string())?;
    }

    Ok(buffer.into_inner())
}

/// Check if audio buffer contains mostly silence
pub fn is_silence(samples: &[f32], threshold: f32) -> bool {
    if samples.is_empty() {
        return true;
    }
    
    let rms: f32 = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    rms < threshold
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wav_encoding() {
        let samples = vec![0.0f32; 16000]; // 1 second of silence
        let wav = encode_wav(&samples, 16000).unwrap();
        
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

---

## Day 5-7: Tauri Commands & Basic UI

### Step 1: Create Tauri Commands

**`src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;

pub use recording::*;
```

**`src-tauri/src/commands/recording.rs`:**
```rust
use crate::audio::{encode_wav, AudioRecorder};
use std::sync::Mutex;
use tauri::State;

pub struct RecorderState(pub Mutex<AudioRecorder>);

#[tauri::command]
pub fn get_microphones() -> Result<Vec<String>, String> {
    AudioRecorder::list_devices()
}

#[tauri::command]
pub fn get_default_microphone() -> Result<String, String> {
    AudioRecorder::default_device_name()
}

#[tauri::command]
pub fn start_recording(state: State<RecorderState>) -> Result<(), String> {
    let recorder = state.0.lock().map_err(|e| e.to_string())?;
    recorder.start_recording()
}

#[tauri::command]
pub fn stop_recording(state: State<RecorderState>) -> Result<Vec<u8>, String> {
    let recorder = state.0.lock().map_err(|e| e.to_string())?;
    let samples = recorder.stop_recording();
    let sample_rate = recorder.sample_rate();
    encode_wav(&samples, sample_rate)
}

#[tauri::command]
pub fn is_recording(state: State<RecorderState>) -> Result<bool, String> {
    let recorder = state.0.lock().map_err(|e| e.to_string())?;
    Ok(recorder.is_recording())
}
```

### Step 2: Update Main Entry Point

**`src-tauri/src/main.rs`:**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod commands;

use commands::{
    get_default_microphone, get_microphones, is_recording, start_recording, stop_recording,
    RecorderState,
};
use audio::AudioRecorder;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .manage(RecorderState(Mutex::new(AudioRecorder::new())))
        .invoke_handler(tauri::generate_handler![
            get_microphones,
            get_default_microphone,
            start_recording,
            stop_recording,
            is_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 3: Create React Components

**`src/stores/recordingStore.ts`:**
```typescript
import { create } from 'zustand';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

interface RecordingStore {
  state: RecordingState;
  transcript: string | null;
  error: string | null;
  setState: (state: RecordingState) => void;
  setTranscript: (transcript: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  state: 'idle',
  transcript: null,
  error: null,
  setState: (state) => set({ state }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (error) => set({ error }),
  reset: () => set({ state: 'idle', transcript: null, error: null }),
}));
```

**`src/lib/tauri.ts`:**
```typescript
import { invoke } from '@tauri-apps/api/core';

export async function getMicrophones(): Promise<string[]> {
  return invoke('get_microphones');
}

export async function getDefaultMicrophone(): Promise<string> {
  return invoke('get_default_microphone');
}

export async function startRecording(): Promise<void> {
  return invoke('start_recording');
}

export async function stopRecording(): Promise<number[]> {
  return invoke('stop_recording');
}

export async function isRecording(): Promise<boolean> {
  return invoke('is_recording');
}
```

**`src/components/RecordButton.tsx`:**
```tsx
import { useState } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { startRecording, stopRecording } from '../lib/tauri';

export const RecordButton = () => {
  const { state, setState, setError } = useRecordingStore();
  const [audioData, setAudioData] = useState<number[] | null>(null);

  const handleToggleRecording = async () => {
    try {
      if (state === 'idle') {
        await startRecording();
        setState('recording');
      } else if (state === 'recording') {
        setState('processing');
        const data = await stopRecording();
        setAudioData(data);
        setState('done');
        
        // Reset after 2 seconds
        setTimeout(() => {
          setState('idle');
        }, 2000);
      }
    } catch (err) {
      setError(err as string);
      setState('idle');
    }
  };

  const getButtonText = () => {
    switch (state) {
      case 'idle':
        return 'Start Recording';
      case 'recording':
        return 'Stop Recording';
      case 'processing':
        return 'Processing...';
      case 'done':
        return 'Done!';
      default:
        return 'Start Recording';
    }
  };

  const getButtonClass = () => {
    const base = 'px-6 py-3 rounded-full font-medium transition-all duration-200';
    switch (state) {
      case 'idle':
        return `${base} bg-blue-500 hover:bg-blue-600 text-white`;
      case 'recording':
        return `${base} bg-red-500 hover:bg-red-600 text-white animate-pulse`;
      case 'processing':
        return `${base} bg-yellow-500 text-white cursor-wait`;
      case 'done':
        return `${base} bg-green-500 text-white`;
      default:
        return `${base} bg-blue-500 text-white`;
    }
  };

  return (
    <button
      onClick={handleToggleRecording}
      disabled={state === 'processing'}
      className={getButtonClass()}
    >
      {getButtonText()}
    </button>
  );
};
```

**`src/components/MicrophoneSelector.tsx`:**
```tsx
import { useEffect, useState } from 'react';
import { getMicrophones, getDefaultMicrophone } from '../lib/tauri';

export const MicrophoneSelector = () => {
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        const [mics, defaultMic] = await Promise.all([
          getMicrophones(),
          getDefaultMicrophone(),
        ]);
        setMicrophones(mics);
        setSelected(defaultMic);
      } catch (err) {
        console.error('Failed to load microphones:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMicrophones();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading microphones...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        Microphone
      </label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {microphones.map((mic) => (
          <option key={mic} value={mic}>
            {mic}
          </option>
        ))}
      </select>
    </div>
  );
};
```

**`src/App.tsx`:**
```tsx
import { RecordButton } from './components/RecordButton';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { useRecordingStore } from './stores/recordingStore';
import './styles/globals.css';

function App() {
  const { state, error } = useRecordingStore();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          VoiceFlow
        </h1>

        <div className="space-y-6">
          <MicrophoneSelector />

          <div className="flex justify-center">
            <RecordButton />
          </div>

          {state === 'recording' && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-gray-600">Listening...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
```

---

## Verification Checklist

Before moving to Phase 2, verify:

- [ ] Project builds without errors (`pnpm tauri dev`)
- [ ] Microphone list populates correctly
- [ ] Recording starts when button is clicked
- [ ] Recording stops and returns audio data
- [ ] UI reflects recording state changes
- [ ] No console errors in browser or Rust

---

## Troubleshooting

### Common Issues

1. **cpal fails to compile**
   - Ensure Xcode Command Line Tools are installed
   - Run `xcode-select --install`

2. **No microphones detected**
   - Check System Preferences > Security & Privacy > Microphone
   - Grant permission to the app

3. **Tauri commands not found**
   - Ensure commands are registered in `main.rs`
   - Check for typos in command names

---

## Next Steps

After completing Phase 1, proceed to [Phase 2: API Integration](./PHASE_2_API_INTEGRATION.md)
