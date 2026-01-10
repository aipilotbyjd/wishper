use reqwest::Client;
use serde::{Deserialize, Serialize};
use super::errors::ApiError;
use super::whisper::ApiProvider;

const OPENAI_CHAT_URL: &str = "https://api.openai.com/v1/chat/completions";
const GROQ_CHAT_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_CHAT_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// OpenAI/Groq format
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

// Gemini format
#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiConfig,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize)]
struct GeminiConfig {
    temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: u32,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiCandidateContent,
}

#[derive(Deserialize)]
struct GeminiCandidateContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Deserialize)]
struct GeminiResponsePart {
    text: String,
}

#[derive(Deserialize)]
struct GptError {
    error: GptErrorDetail,
}

#[derive(Deserialize)]
struct GptErrorDetail {
    message: String,
}

const SYSTEM_PROMPT: &str = r#"You are a voice transcription cleaner. Your ONLY job is to:

1. Remove filler words: um, uh, like, you know, basically, actually, so, well, I mean
2. Fix typos and transcription errors
3. Add punctuation (periods, commas where natural pauses occur)
4. Capitalize properly

STRICT RULES:
- Keep the EXACT same sentence structure
- Do NOT reformat into lists or bullet points
- Do NOT rephrase or rewrite
- Do NOT add or remove information
- Output should read naturally as spoken text

Example:
Input: "um so I need to like send an email to sara about the quarterly report and uh schedule a meeting with engineering"
Output: "I need to send an email to Sara about the quarterly report and schedule a meeting with engineering."

Output ONLY the cleaned text:"#;

pub async fn polish_text(raw_text: &str, api_key: &str, provider: ApiProvider) -> Result<String, ApiError> {
    println!("[GPT] Polishing text: '{}'", raw_text);
    
    if api_key.is_empty() {
        return Err(ApiError::NoApiKey);
    }

    if raw_text.trim().is_empty() {
        return Ok(String::new());
    }

    let client = Client::new();
    
    // Gemini uses different API format
    if provider == ApiProvider::Gemini {
        return polish_with_gemini(raw_text, api_key, &client).await;
    }

    let (api_url, model) = match provider {
        ApiProvider::OpenAI => (OPENAI_CHAT_URL, "gpt-4o-mini"),
        ApiProvider::Groq => (GROQ_CHAT_URL, "llama-3.3-70b-versatile"),
        ApiProvider::Gemini => unreachable!(),
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

async fn polish_with_gemini(raw_text: &str, api_key: &str, client: &Client) -> Result<String, ApiError> {
    let prompt = format!("{}\n\nText to clean: {}", SYSTEM_PROMPT, raw_text);
    
    let request = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: prompt }],
        }],
        generation_config: GeminiConfig {
            temperature: 0.0,
            max_output_tokens: 2048,
        },
    };

    let url = format!("{}?key={}", GEMINI_CHAT_URL, api_key);
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;

    let status = response.status();

    if status.is_success() {
        let result: GeminiResponse = response.json().await?;
        if let Some(candidate) = result.candidates.first() {
            if let Some(part) = candidate.content.parts.first() {
                return Ok(part.text.trim().to_string());
            }
        }
        Err(ApiError::PolishingFailed("No response from Gemini".to_string()))
    } else if status == reqwest::StatusCode::UNAUTHORIZED || status.as_u16() == 403 {
        Err(ApiError::InvalidApiKey)
    } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        Err(ApiError::RateLimitExceeded)
    } else {
        let error_text = response.text().await.unwrap_or_default();
        Err(ApiError::PolishingFailed(format!("Gemini error: {}", error_text)))
    }
}
