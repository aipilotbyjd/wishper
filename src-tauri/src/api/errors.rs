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
