use crate::api::{transcribe_audio, polish_text, ApiProvider};

fn parse_provider(provider: &str) -> ApiProvider {
    match provider.to_lowercase().as_str() {
        "groq" => ApiProvider::Groq,
        "gemini" => ApiProvider::Gemini,
        _ => ApiProvider::OpenAI,
    }
}

#[tauri::command]
pub async fn transcribe(
    audio_data: Vec<u8>,
    api_key: String,
    language: String,
    provider: String,
) -> Result<String, String> {
    transcribe_audio(audio_data, &api_key, &language, parse_provider(&provider))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn polish(raw_text: String, api_key: String, provider: String) -> Result<String, String> {
    polish_text(&raw_text, &api_key, parse_provider(&provider))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn transcribe_and_polish(
    audio_data: Vec<u8>,
    transcription_api_key: String,
    polishing_api_key: String,
    language: String,
    should_polish: bool,
    transcription_provider: String,
    polishing_provider: String,
) -> Result<TranscriptionResult, String> {
    let trans_provider = parse_provider(&transcription_provider);
    let polish_provider = parse_provider(&polishing_provider);
    
    let raw_text = transcribe_audio(audio_data, &transcription_api_key, &language, trans_provider)
        .await
        .map_err(|e| e.to_string())?;

    let polished_text = if should_polish && !raw_text.is_empty() {
        Some(
            polish_text(&raw_text, &polishing_api_key, polish_provider)
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
