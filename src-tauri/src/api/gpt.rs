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
9. Return ONLY the polished text, no explanations or quotes around it"#;

pub async fn polish_text(raw_text: &str, api_key: &str) -> Result<String, ApiError> {
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if raw_text.trim().is_empty() {
        return Ok(String::new());
    }

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
