use reqwest::multipart;
use serde::Deserialize;
use super::errors::ApiError;

const WHISPER_API_URL: &str = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_SIZE: usize = 25 * 1024 * 1024;

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
) -> Result<String, ApiError> {
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if audio_data.len() > MAX_AUDIO_SIZE {
        return Err(ApiError::AudioTooLarge);
    }

    let part = multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| ApiError::TranscriptionFailed(e.to_string()))?;

    let form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("language", language.to_string())
        .text("response_format", "json");

    let client = reqwest::Client::new();
    let response = client
        .post(WHISPER_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await?;

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
            },
        });
        Err(ApiError::TranscriptionFailed(error.error.message))
    }
}
