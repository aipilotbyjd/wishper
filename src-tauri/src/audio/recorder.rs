use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::thread;

pub struct AudioRecorder {
    is_recording: Arc<Mutex<bool>>,
    audio_buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: Arc<Mutex<u32>>,
}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            sample_rate: Arc::new(Mutex::new(44100)),
        }
    }

    pub fn list_devices() -> Result<Vec<String>, String> {
        let host = cpal::default_host();
        let devices: Vec<String> = host
            .input_devices()
            .map_err(|e| e.to_string())?
            .filter_map(|d| d.name().ok())
            .collect();
        Ok(devices)
    }

    pub fn default_device_name() -> Result<String, String> {
        let host = cpal::default_host();
        host.default_input_device()
            .ok_or("No default input device".to_string())?
            .name()
            .map_err(|e| e.to_string())
    }

    pub fn start_recording(&self) -> Result<(), String> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No input device available")?;

        let default_config = device
            .default_input_config()
            .map_err(|e| e.to_string())?;
        
        *self.sample_rate.lock().unwrap() = default_config.sample_rate().0;
        
        let config: cpal::StreamConfig = default_config.into();

        self.audio_buffer.lock().unwrap().clear();
        *self.is_recording.lock().unwrap() = true;

        let buffer = self.audio_buffer.clone();
        let is_recording = self.is_recording.clone();

        let stream = device
            .build_input_stream(
                &config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if *is_recording.lock().unwrap() {
                        buffer.lock().unwrap().extend_from_slice(data);
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
            .map_err(|e| e.to_string())?;

        stream.play().map_err(|e| e.to_string())?;

        thread::spawn(move || {
            loop {
                thread::sleep(std::time::Duration::from_millis(100));
            }
        });

        Ok(())
    }

    pub fn stop_recording(&self) -> Vec<f32> {
        *self.is_recording.lock().unwrap() = false;
        let samples = self.audio_buffer.lock().unwrap().clone();
        self.audio_buffer.lock().unwrap().clear();
        samples
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    pub fn sample_rate(&self) -> u32 {
        *self.sample_rate.lock().unwrap()
    }
}

impl Default for AudioRecorder {
    fn default() -> Self {
        Self::new()
    }
}
