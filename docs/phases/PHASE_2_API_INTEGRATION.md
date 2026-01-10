# Phase 2: API Integration (Week 2)

> **Duration:** Days 8-14
> **Goal:** Integrate OpenAI Whisper for transcription and GPT for text polishing

---

## Day 8-10: Whisper API Integration

### Step 1: Create API Module Structure

Create the following files in `src-tauri/src/`:

**`src-tauri/src/api/mod.rs`:**
```rust
pub mod whisper;
pub mod gpt;
pub mod errors;

pub use whisper::transcribe_audio;
pub use gpt::polish_text;
pub use errors::ApiError;
```

### Step 2: Define API Error Types

**`src-tauri/src/api/errors.rs`:**
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("API rate limit exceeded. Please wait and try again.")]
    RateLimitExceeded,

    #[error("Invalid API key. Please check your settings.")]
    InvalidApiKey,

    #[error("Audio file too large (max 25MB)")]
    AudioTooLarge,

    #[error("Transcription failed: {0}")]
    TranscriptionFailed(String),

    #[error("Text polishing failed: {0}")]
    PolishingFailed(String),

    #[error("No API key configured")]
    NoApiKey,

    #[error("Request timeout")]
    Timeout,
}

impl serde::Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

### Step 3: Implement Whisper Client

**`src-tauri/src/api/whisper.rs`:**
```rust
use reqwest::multipart;
use serde::Deserialize;
use super::errors::ApiError;

const WHISPER_API_URL: &str = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_SIZE: usize = 25 * 1024 * 1024; // 25MB

#[derive(Deserialize)]
struct WhisperResponse {
    text: String,
}

#[derive(Deserialize)]
struct WhisperError {
    error: WhisperErrorDetail,
}

#[derive(Deserialize)]
struct WhisperErrorDetail {
    message: String,
    #[serde(rename = "type")]
    error_type: Option<String>,
    code: Option<String>,
}

/// Transcribe audio using OpenAI Whisper API
///
/// # Arguments
/// * `audio_data` - WAV audio bytes
/// * `api_key` - OpenAI API key
/// * `language` - Language code (e.g., "en", "es", "fr")
///
/// # Returns
/// Transcribed text or error
pub async fn transcribe_audio(
    audio_data: Vec<u8>,
    api_key: &str,
    language: &str,
) -> Result<String, ApiError> {
    // Validate inputs
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if audio_data.len() > MAX_AUDIO_SIZE {
        return Err(ApiError::AudioTooLarge);
    }

    // Create multipart form
    let part = multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| ApiError::TranscriptionFailed(e.to_string()))?;

    let form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("language", language.to_string())
        .text("response_format", "json");

    // Make API request
    let client = reqwest::Client::new();
    let response = client
        .post(WHISPER_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await?;

    // Handle response
    let status = response.status();

    if status.is_success() {
        let result: WhisperResponse = response.json().await?;
        Ok(result.text)
    } else if status == reqwest::StatusCode::UNAUTHORIZED {
        Err(ApiError::InvalidApiKey)
    } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        Err(ApiError::RateLimitExceeded)
    } else {
        let error: WhisperError = response.json().await.unwrap_or(WhisperError {
            error: WhisperErrorDetail {
                message: "Unknown error".to_string(),
                error_type: None,
                code: None,
            },
        });
        Err(ApiError::TranscriptionFailed(error.error.message))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_empty_api_key() {
        let result = transcribe_audio(vec![0u8; 100], "", "en").await;
        assert!(matches!(result, Err(ApiError::NoApiKey)));
    }

    #[tokio::test]
    async fn test_audio_too_large() {
        let large_audio = vec![0u8; 30 * 1024 * 1024]; // 30MB
        let result = transcribe_audio(large_audio, "test-key", "en").await;
        assert!(matches!(result, Err(ApiError::AudioTooLarge)));
    }
}
```

---

## Day 11-14: GPT Text Polishing

### Step 1: Implement GPT Client

**`src-tauri/src/api/gpt.rs`:**
```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};
use super::errors::ApiError;

const GPT_API_URL: &str = "https://api.openai.com/v1/chat/completions";

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

#[derive(Deserialize)]
struct GptError {
    error: GptErrorDetail,
}

#[derive(Deserialize)]
struct GptErrorDetail {
    message: String,
}

/// System prompt for text polishing
const SYSTEM_PROMPT: &str = r#"You are a text polishing assistant. Your job is to clean up voice-transcribed text.

Rules:
1. Remove filler words: um, uh, like, you know, basically, actually, literally, so, well
2. Remove false starts and repetitions
3. Add proper punctuation (periods, commas, question marks)
4. Fix obvious grammar mistakes
5. Maintain the original meaning and tone
6. Keep the text natural, don't make it overly formal
7. Preserve technical terms, names, and specific vocabulary
8. Format lists if the speaker clearly intends a list
9. Return ONLY the polished text, no explanations or quotes around it

Example:
Input: "so um I was thinking that we could like maybe have a meeting tomorrow um at like 3 pm or something"
Output: I was thinking we could have a meeting tomorrow at 3 PM."#;

/// Polish transcribed text using GPT
///
/// # Arguments
/// * `raw_text` - The raw transcribed text
/// * `api_key` - OpenAI API key
///
/// # Returns
/// Polished text or error
pub async fn polish_text(raw_text: &str, api_key: &str) -> Result<String, ApiError> {
    // Validate inputs
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if raw_text.trim().is_empty() {
        return Ok(String::new());
    }

    // Build request
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

    // Make API request
    let client = Client::new();
    let response = client
        .post(GPT_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;

    // Handle response
    let status = response.status();

    if status.is_success() {
        let result: ChatResponse = response.json().await?;
        if let Some(choice) = result.choices.first() {
            Ok(choice.message.content.trim().to_string())
        } else {
            Err(ApiError::PolishingFailed("No response from GPT".to_string()))
        }
    } else if status == reqwest::StatusCode::UNAUTHORIZED {
        Err(ApiError::InvalidApiKey)
    } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        Err(ApiError::RateLimitExceeded)
    } else {
        let error: GptError = response.json().await.unwrap_or(GptError {
            error: GptErrorDetail {
                message: "Unknown error".to_string(),
            },
        });
        Err(ApiError::PolishingFailed(error.error.message))
    }
}

/// Polish text with custom instructions
pub async fn polish_text_with_context(
    raw_text: &str,
    api_key: &str,
    context: &str,
) -> Result<String, ApiError> {
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    let enhanced_prompt = format!(
        "{}\n\nAdditional context: {}",
        SYSTEM_PROMPT, context
    );

    let request = ChatRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: enhanced_prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: raw_text.to_string(),
            },
        ],
        temperature: 0.3,
        max_tokens: 2048,
    };

    let client = Client::new();
    let response = client
        .post(GPT_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;

    let status = response.status();

    if status.is_success() {
        let result: ChatResponse = response.json().await?;
        if let Some(choice) = result.choices.first() {
            Ok(choice.message.content.trim().to_string())
        } else {
            Err(ApiError::PolishingFailed("No response from GPT".to_string()))
        }
    } else {
        Err(ApiError::PolishingFailed("API request failed".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_empty_api_key() {
        let result = polish_text("test text", "").await;
        assert!(matches!(result, Err(ApiError::NoApiKey)));
    }

    #[tokio::test]
    async fn test_empty_text() {
        let result = polish_text("", "test-key").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "");
    }
}
```

### Step 2: Create Tauri Commands for API

**`src-tauri/src/commands/transcription.rs`:**
```rust
use crate::api::{transcribe_audio, polish_text, ApiError};

#[tauri::command]
pub async fn transcribe(
    audio_data: Vec<u8>,
    api_key: String,
    language: String,
) -> Result<String, String> {
    transcribe_audio(audio_data, &api_key, &language)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn polish(raw_text: String, api_key: String) -> Result<String, String> {
    polish_text(&raw_text, &api_key)
        .await
        .map_err(|e| e.to_string())
}

/// Combined transcribe and polish in one call
#[tauri::command]
pub async fn transcribe_and_polish(
    audio_data: Vec<u8>,
    api_key: String,
    language: String,
    should_polish: bool,
) -> Result<TranscriptionResult, String> {
    // First, transcribe
    let raw_text = transcribe_audio(audio_data, &api_key, &language)
        .await
        .map_err(|e| e.to_string())?;

    // Then polish if requested
    let polished_text = if should_polish && !raw_text.is_empty() {
        Some(
            polish_text(&raw_text, &api_key)
                .await
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    Ok(TranscriptionResult {
        raw_text,
        polished_text,
    })
}

#[derive(serde::Serialize)]
pub struct TranscriptionResult {
    pub raw_text: String,
    pub polished_text: Option<String>,
}
```

### Step 3: Update Module Exports

**Update `src-tauri/src/commands/mod.rs`:**
```rust
pub mod recording;
pub mod transcription;

pub use recording::*;
pub use transcription::*;
```

### Step 4: Register Commands in Main

**Update `src-tauri/src/main.rs`:**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod api;
mod commands;

use commands::{
    get_default_microphone, get_microphones, is_recording, start_recording, stop_recording,
    transcribe, polish, transcribe_and_polish,
    RecorderState,
};
use audio::AudioRecorder;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Frontend Integration

### Step 1: Update Tauri API Wrapper

**Update `src/lib/tauri.ts`:**
```typescript
import { invoke } from '@tauri-apps/api/core';

// Recording functions
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

// API functions
export async function transcribe(
  audioData: number[],
  apiKey: string,
  language: string
): Promise<string> {
  return invoke('transcribe', {
    audioData,
    apiKey,
    language,
  });
}

export async function polish(rawText: string, apiKey: string): Promise<string> {
  return invoke('polish', {
    rawText,
    apiKey,
  });
}

export interface TranscriptionResult {
  raw_text: string;
  polished_text: string | null;
}

export async function transcribeAndPolish(
  audioData: number[],
  apiKey: string,
  language: string,
  shouldPolish: boolean
): Promise<TranscriptionResult> {
  return invoke('transcribe_and_polish', {
    audioData,
    apiKey,
    language,
    shouldPolish,
  });
}
```

### Step 2: Create Settings Store

**`src/stores/settingsStore.ts`:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  apiKey: string;
  language: string;
  shouldPolish: boolean;
  setApiKey: (key: string) => void;
  setLanguage: (lang: string) => void;
  setShouldPolish: (polish: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKey: '',
      language: 'en',
      shouldPolish: true,
      setApiKey: (apiKey) => set({ apiKey }),
      setLanguage: (language) => set({ language }),
      setShouldPolish: (shouldPolish) => set({ shouldPolish }),
    }),
    {
      name: 'voiceflow-settings',
    }
  )
);
```

### Step 3: Create API Key Input Component

**`src/components/ApiKeyInput.tsx`:**
```tsx
import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export const ApiKeyInput = () => {
  const { apiKey, setApiKey } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    setApiKey(tempKey);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        OpenAI API Key
      </label>
      <div className="flex gap-2">
        <input
          type={showKey ? 'text' : 'password'}
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          placeholder="sk-..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="px-3 py-2 text-gray-600 hover:text-gray-800"
        >
          {showKey ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
      <button
        onClick={handleSave}
        disabled={tempKey === apiKey}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Key
      </button>
      {!apiKey && (
        <p className="text-sm text-amber-600">
          ⚠️ API key required for transcription
        </p>
      )}
    </div>
  );
};
```

### Step 4: Update Recording Flow

**Update `src/components/RecordButton.tsx`:**
```tsx
import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import { startRecording, stopRecording, transcribeAndPolish } from '../lib/tauri';

export const RecordButton = () => {
  const { state, setState, setTranscript, setError } = useRecordingStore();
  const { apiKey, language, shouldPolish } = useSettingsStore();

  const handleToggleRecording = async () => {
    try {
      if (state === 'idle') {
        if (!apiKey) {
          setError('Please enter your OpenAI API key first');
          return;
        }
        await startRecording();
        setState('recording');
      } else if (state === 'recording') {
        setState('processing');
        
        // Stop recording and get audio data
        const audioData = await stopRecording();
        
        // Transcribe and optionally polish
        const result = await transcribeAndPolish(
          audioData,
          apiKey,
          language,
          shouldPolish
        );
        
        // Use polished text if available, otherwise raw
        const finalText = result.polished_text || result.raw_text;
        setTranscript(finalText);
        setState('done');
        
        // Reset after showing result
        setTimeout(() => {
          setState('idle');
        }, 3000);
      }
    } catch (err) {
      console.error('Recording error:', err);
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

### Step 5: Create Transcript Display

**`src/components/TranscriptDisplay.tsx`:**
```tsx
import { useRecordingStore } from '../stores/recordingStore';

export const TranscriptDisplay = () => {
  const { transcript, state } = useRecordingStore();

  if (!transcript && state !== 'processing') {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {state === 'processing' ? 'Processing...' : 'Transcript'}
      </h3>
      {state === 'processing' ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Transcribing and polishing...</span>
        </div>
      ) : (
        <p className="text-gray-900">{transcript}</p>
      )}
    </div>
  );
};
```

### Step 6: Update App Component

**Update `src/App.tsx`:**
```tsx
import { RecordButton } from './components/RecordButton';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ApiKeyInput } from './components/ApiKeyInput';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { useRecordingStore } from './stores/recordingStore';
import { useSettingsStore } from './stores/settingsStore';
import './styles/globals.css';

function App() {
  const { error } = useRecordingStore();
  const { shouldPolish, setShouldPolish } = useSettingsStore();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          VoiceFlow
        </h1>

        <div className="space-y-6">
          <ApiKeyInput />

          <MicrophoneSelector />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="polish"
              checked={shouldPolish}
              onChange={(e) => setShouldPolish(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="polish" className="text-sm text-gray-700">
              Polish text with AI (remove filler words, add punctuation)
            </label>
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
  );
}

export default App;
```

---

## Environment Setup

### Create .env.example

**`.env.example`:**
```env
# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-key-here
```

### Add to .gitignore

**Update `.gitignore`:**
```
# Environment files
.env
.env.local
.env.*.local

# API keys should never be committed
**/secrets/
```

---

## Verification Checklist

Before moving to Phase 3, verify:

- [ ] API key can be saved and persists
- [ ] Recording captures audio correctly
- [ ] Whisper transcription returns text
- [ ] GPT polishing cleans up the text
- [ ] Combined flow works end-to-end
- [ ] Error messages display properly
- [ ] Rate limit errors are handled gracefully

---

## Testing the API

### Manual Test Steps

1. Get an OpenAI API key from https://platform.openai.com
2. Enter the API key in the app
3. Click "Start Recording" and speak a test phrase like:
   - "um so I was like thinking that we could um maybe have a meeting tomorrow"
4. Click "Stop Recording"
5. Verify:
   - Raw transcription is accurate
   - Polished text removes "um", "like", "so"
   - Punctuation is added correctly

### Expected Results

**Input speech:** "um so I was like thinking that we could um maybe have a meeting tomorrow at like 3 pm"

**Raw transcription:** "um so I was like thinking that we could um maybe have a meeting tomorrow at like 3 pm"

**Polished output:** "I was thinking we could have a meeting tomorrow at 3 PM."

---

## Cost Awareness

### API Pricing (as of 2024)

| API | Cost |
|-----|------|
| Whisper | $0.006 per minute |
| GPT-4o-mini | $0.15 per 1M input tokens, $0.60 per 1M output tokens |

### Estimated Cost Per Dictation

- Average dictation: 30 seconds = $0.003 (Whisper)
- Average polish: ~100 tokens = ~$0.0001 (GPT)
- **Total per dictation: ~$0.003**

---

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify key starts with `sk-`
   - Check key hasn't expired
   - Ensure billing is set up on OpenAI

2. **"Rate limit exceeded"**
   - Wait 60 seconds and retry
   - Check OpenAI usage dashboard
   - Consider upgrading API tier

3. **Transcription is inaccurate**
   - Check microphone input levels
   - Ensure audio is being recorded properly
   - Try speaking more clearly

4. **Polishing removes too much**
   - This is expected behavior
   - Adjust system prompt if needed

---

## Next Steps

After completing Phase 2, proceed to [Phase 3: Core Features - Hotkey & Auto-Paste](./PHASE_3_CORE_FEATURES.md)
