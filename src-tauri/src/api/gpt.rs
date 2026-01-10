use reqwest::Client;
use serde::{Deserialize, Serialize};
use super::errors::ApiError;
use super::whisper::ApiProvider;

const OPENAI_CHAT_URL: &str = "https://api.openai.com/v1/chat/completions";
const GROQ_CHAT_URL: &str = "https://api.groq.com/openai/v1/chat/completions";

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

const SYSTEM_PROMPT: &str = r#"Polish the following transcribed text. Remove filler words (um, uh, like), fix grammar, add punctuation. Return ONLY the polished text with no explanation."#;

pub async fn polish_text(raw_text: &str, api_key: &str, provider: ApiProvider) -> Result<String, ApiError> {
    println!("[GPT] Polishing text: '{}'", raw_text);
    
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if raw_text.trim().is_empty() {
        return Ok(String::new());
    }

    let (api_url, model) = match provider {
        ApiProvider::OpenAI => (OPENAI_CHAT_URL, "gpt-4o-mini"),
        ApiProvider::Groq => (GROQ_CHAT_URL, "llama-3.3-70b-versatile"),
    };

    let request = ChatRequest {
        model: model.to_string(),
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
        temperature: 0.0,
        max_tokens: 2048,
    };

    let client = Client::new();
    let response = client
        .post(api_url)
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
