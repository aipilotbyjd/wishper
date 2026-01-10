use hound::{WavSpec, WavWriter};
use std::io::Cursor;

const TARGET_SAMPLE_RATE: u32 = 16000;

pub fn encode_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    // Resample to 16kHz if needed (Whisper prefers 16kHz)
    let resampled = if sample_rate != TARGET_SAMPLE_RATE {
        resample(samples, sample_rate, TARGET_SAMPLE_RATE)
    } else {
        samples.to_vec()
    };

    let spec = WavSpec {
        channels: 1,
        sample_rate: TARGET_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut buffer = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut buffer, spec).map_err(|e| e.to_string())?;

        for &sample in &resampled {
            let sample_i16 = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
            writer.write_sample(sample_i16).map_err(|e| e.to_string())?;
        }

        writer.finalize().map_err(|e| e.to_string())?;
    }

    Ok(buffer.into_inner())
}

fn resample(samples: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    let ratio = to_rate as f64 / from_rate as f64;
    let new_len = (samples.len() as f64 * ratio) as usize;
    let mut resampled = Vec::with_capacity(new_len);
    
    for i in 0..new_len {
        let src_idx = i as f64 / ratio;
        let idx = src_idx as usize;
        let frac = src_idx - idx as f64;
        
        let sample = if idx + 1 < samples.len() {
            samples[idx] * (1.0 - frac as f32) + samples[idx + 1] * frac as f32
        } else if idx < samples.len() {
            samples[idx]
        } else {
            0.0
        };
        resampled.push(sample);
    }
    
    resampled
}

pub fn is_silence(samples: &[f32], threshold: f32) -> bool {
    if samples.is_empty() {
        return true;
    }
    
    let rms: f32 = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    rms < threshold
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wav_encoding() {
        let samples = vec![0.0f32; 16000];
        let wav = encode_wav(&samples, 16000).unwrap();
        
        assert!(wav.len() > 44);
        assert_eq!(&wav[0..4], b"RIFF");
    }

    #[test]
    fn test_silence_detection() {
        let silent = vec![0.001f32; 1000];
        let loud = vec![0.5f32; 1000];
        
        assert!(is_silence(&silent, 0.01));
        assert!(!is_silence(&loud, 0.01));
    }
}
