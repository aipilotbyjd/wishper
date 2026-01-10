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

const SYSTEM_PROMPT: &str = r#"You are a voice-to-text assistant that cleans and formats dictated speech.

TASKS:
1. Remove filler words: um, uh, er, like, you know, basically, actually, so, well, I mean
2. Remove false starts and repeated words
3. Add proper punctuation and capitalization
4. Format lists when the speaker says "first, second" or "one, two" etc.
5. Convert spoken numbers to digits when appropriate (e.g., "twenty three" → "23")
6. Fix grammar naturally without changing meaning

STRICT RULES:
- NEVER add content that wasn't spoken
- NEVER expand abbreviations unless spoken
- NEVER add responses or commentary
- NEVER explain or describe - just output clean text
- Keep the speaker's tone and intent
- If input is very short, output it cleaned (don't pad it)

EXAMPLES:
"um so like I need to uh send an email to john about the the meeting tomorrow" → "I need to send an email to John about the meeting tomorrow."

"hey uh can you like help me with this thing" → "Hey, can you help me with this thing?"

"first we need to do the design second the implementation and third testing" → "First, we need to do the design. Second, the implementation. Third, testing."

"I have like twenty three items" → "I have 23 items."

"hello" → "Hello."

Output ONLY the cleaned text:"#;

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
