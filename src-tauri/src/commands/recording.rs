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
    println!("[Recording] Captured {} samples at {} Hz", samples.len(), sample_rate);
    let wav = encode_wav(&samples, sample_rate)?;
    println!("[Recording] Encoded WAV: {} bytes", wav.len());
    
    // Debug: save to file to verify format
    if let Err(e) = std::fs::write("/tmp/debug_audio.wav", &wav) {
        println!("[Recording] Failed to save debug file: {}", e);
    } else {
        println!("[Recording] Saved debug file to /tmp/debug_audio.wav");
    }
    
    Ok(wav)
}

#[tauri::command]
pub fn is_recording(state: State<RecorderState>) -> Result<bool, String> {
    let recorder = state.0.lock().map_err(|e| e.to_string())?;
    Ok(recorder.is_recording())
}
