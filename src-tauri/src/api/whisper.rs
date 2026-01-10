use reqwest::multipart;
use serde::Deserialize;
use super::errors::ApiError;

const OPENAI_WHISPER_URL: &str = "https://api.openai.com/v1/audio/transcriptions";
const GROQ_WHISPER_URL: &str = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_AUDIO_SIZE: usize = 25 * 1024 * 1024;

#[derive(Clone, Copy, PartialEq)]
pub enum ApiProvider {
    OpenAI,
    Groq,
}

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
}

pub async fn transcribe_audio(
    audio_data: Vec<u8>,
    api_key: &str,
    language: &str,
    provider: ApiProvider,
) -> Result<String, ApiError> {
    println!("[Whisper] Audio data size: {} bytes, provider: {:?}", audio_data.len(), 
        if provider == ApiProvider::Groq { "Groq" } else { "OpenAI" });
    
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if audio_data.len() < 1000 {
        println!("[Whisper] Audio too short!");
        return Err(ApiError::TranscriptionFailed("Audio too short - please speak longer".to_string()));
    }

    if audio_data.len() > MAX_AUDIO_SIZE {
        return Err(ApiError::AudioTooLarge);
    }

    let part = multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| ApiError::TranscriptionFailed(e.to_string()))?;

    let (api_url, model) = match provider {
        ApiProvider::OpenAI => (OPENAI_WHISPER_URL, "whisper-1"),
        ApiProvider::Groq => (GROQ_WHISPER_URL, "whisper-large-v3"),
    };

    let form = multipart::Form::new()
        .part("file", part)
        .text("model", model)
        .text("language", language.to_string())
        .text("response_format", "json");

    let client = reqwest::Client::new();
    let response = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await?;

    let status = response.status();
    println!("[Whisper] Response status: {}", status);

    if status.is_success() {
        let result: WhisperResponse = response.json().await?;
        println!("[Whisper] Transcription success: {} chars", result.text.len());
        Ok(result.text)
    } else if status == reqwest::StatusCode::UNAUTHORIZED {
        println!("[Whisper] Error: Invalid API key");
        Err(ApiError::InvalidApiKey)
    } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        println!("[Whisper] Error: Rate limit exceeded");
        Err(ApiError::RateLimitExceeded)
    } else {
        let body = response.text().await.unwrap_or_default();
        println!("[Whisper] Error response: {}", body);
        
        let error_msg = if let Ok(err) = serde_json::from_str::<WhisperError>(&body) {
            err.error.message
        } else {
            format!("HTTP {}: {}", status, body)
        };
        Err(ApiError::TranscriptionFailed(error_msg))
    }
}
