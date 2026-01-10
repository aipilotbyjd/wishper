# Phase 7: Polish & Edge Cases (Week 7)

> **Duration:** Days 43-49
> **Goal:** Comprehensive error handling, performance optimization, and UX polish

---

## Day 43-45: Error Handling & Offline State

### Step 1: Create Error Types and Handler

**`src-tauri/src/errors.rs`:**
```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Network error: {0}")]
    Network(String),

    #[error("API rate limit exceeded. Please wait a moment and try again.")]
    RateLimit,

    #[error("Invalid API key. Please check your OpenAI API key in settings.")]
    InvalidApiKey,

    #[error("No API key configured. Please add your OpenAI API key in settings.")]
    NoApiKey,

    #[error("Audio recording failed: {0}")]
    AudioRecording(String),

    #[error("Transcription failed: {0}")]
    Transcription(String),

    #[error("Text polishing failed: {0}")]
    Polishing(String),

    #[error("Clipboard operation failed: {0}")]
    Clipboard(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Permission denied: {0}")]
    Permission(String),

    #[error("Microphone not found. Please check your audio settings.")]
    MicrophoneNotFound,

    #[error("Audio too long. Maximum recording is 5 minutes.")]
    AudioTooLong,

    #[error("No audio recorded. Please speak into your microphone.")]
    NoAudioRecorded,

    #[error("Request timed out. Please try again.")]
    Timeout,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl AppError {
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::Network(_) => "NETWORK_ERROR",
            AppError::RateLimit => "RATE_LIMIT",
            AppError::InvalidApiKey => "INVALID_API_KEY",
            AppError::NoApiKey => "NO_API_KEY",
            AppError::AudioRecording(_) => "AUDIO_RECORDING_ERROR",
            AppError::Transcription(_) => "TRANSCRIPTION_ERROR",
            AppError::Polishing(_) => "POLISHING_ERROR",
            AppError::Clipboard(_) => "CLIPBOARD_ERROR",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Permission(_) => "PERMISSION_ERROR",
            AppError::MicrophoneNotFound => "MICROPHONE_NOT_FOUND",
            AppError::AudioTooLong => "AUDIO_TOO_LONG",
            AppError::NoAudioRecorded => "NO_AUDIO_RECORDED",
            AppError::Timeout => "TIMEOUT",
            AppError::Unknown(_) => "UNKNOWN_ERROR",
        }
    }

    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            AppError::Network(_) | AppError::RateLimit | AppError::Timeout
        )
    }

    pub fn user_action(&self) -> Option<&'static str> {
        match self {
            AppError::InvalidApiKey | AppError::NoApiKey => Some("open_settings"),
            AppError::MicrophoneNotFound => Some("check_audio"),
            AppError::Permission(_) => Some("grant_permission"),
            _ => None,
        }
    }
}
```

### Step 2: Create Network Status Monitor

**`src-tauri/src/network.rs`:**
```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

static IS_ONLINE: AtomicBool = AtomicBool::new(true);

/// Check if the app has network connectivity
pub async fn check_connectivity() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap();

    match client.get("https://api.openai.com/v1/models").send().await {
        Ok(response) => {
            // 401 means we reached the server (just not authenticated)
            let online = response.status().is_success() 
                || response.status() == reqwest::StatusCode::UNAUTHORIZED;
            IS_ONLINE.store(online, Ordering::SeqCst);
            online
        }
        Err(_) => {
            IS_ONLINE.store(false, Ordering::SeqCst);
            false
        }
    }
}

/// Get cached connectivity status
pub fn is_online() -> bool {
    IS_ONLINE.load(Ordering::SeqCst)
}

/// Set connectivity status
pub fn set_online(online: bool) {
    IS_ONLINE.store(online, Ordering::SeqCst);
}
```

### Step 3: Create Retry Logic

**`src-tauri/src/retry.rs`:**
```rust
use std::time::Duration;
use tokio::time::sleep;

pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(10),
            multiplier: 2.0,
        }
    }
}

pub async fn retry_with_backoff<T, E, F, Fut>(
    config: &RetryConfig,
    mut operation: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Debug,
{
    let mut delay = config.initial_delay;
    let mut attempts = 0;

    loop {
        attempts += 1;
        
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) if attempts < config.max_attempts => {
                eprintln!("Attempt {} failed: {:?}. Retrying in {:?}...", attempts, e, delay);
                sleep(delay).await;
                delay = std::cmp::min(
                    Duration::from_secs_f64(delay.as_secs_f64() * config.multiplier),
                    config.max_delay,
                );
            }
            Err(e) => return Err(e),
        }
    }
}
```

### Step 4: Create Frontend Error Components

**`src/components/ErrorToast.tsx`:**
```tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorToastProps {
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss: () => void;
  duration?: number;
}

export const ErrorToast = ({
  message,
  type,
  action,
  onDismiss,
  duration = 5000,
}: ErrorToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className={`${bgColor} text-white rounded-xl shadow-lg p-4 flex items-start gap-3 max-w-md`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm underline hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 hover:opacity-70"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </motion.div>
  );
};
```

**`src/components/ErrorToastContainer.tsx`:**
```tsx
import { AnimatePresence } from 'framer-motion';
import { ErrorToast } from './ErrorToast';
import { useErrorStore } from '../stores/errorStore';

export const ErrorToastContainer = () => {
  const { errors, removeError } = useErrorStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {errors.map((error) => (
          <ErrorToast
            key={error.id}
            message={error.message}
            type={error.type}
            action={error.action}
            onDismiss={() => removeError(error.id)}
            duration={error.duration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
```

**`src/stores/errorStore.ts`:**
```typescript
import { create } from 'zustand';

interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ErrorStore {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  addError: (error) =>
    set((state) => ({
      errors: [
        ...state.errors,
        { ...error, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  removeError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),
  clearErrors: () => set({ errors: [] }),
}));
```

### Step 5: Create Offline Indicator

**`src/components/OfflineIndicator.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium z-50"
        >
          You're offline. Dictation requires an internet connection.
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

---

## Day 46-49: Performance & Polish

### Step 1: Optimize Audio Handling

**`src-tauri/src/audio/buffer.rs`:**
```rust
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;

const MAX_BUFFER_SIZE: usize = 16000 * 60 * 5; // 5 minutes at 16kHz

pub struct AudioBuffer {
    samples: Arc<Mutex<VecDeque<f32>>>,
    max_size: usize,
}

impl AudioBuffer {
    pub fn new() -> Self {
        Self {
            samples: Arc::new(Mutex::new(VecDeque::with_capacity(MAX_BUFFER_SIZE))),
            max_size: MAX_BUFFER_SIZE,
        }
    }

    pub fn push(&self, sample: f32) -> bool {
        let mut samples = self.samples.lock().unwrap();
        
        if samples.len() >= self.max_size {
            return false; // Buffer full
        }
        
        samples.push_back(sample);
        true
    }

    pub fn push_slice(&self, slice: &[f32]) -> bool {
        let mut samples = self.samples.lock().unwrap();
        
        if samples.len() + slice.len() > self.max_size {
            return false; // Would exceed buffer
        }
        
        samples.extend(slice.iter().copied());
        true
    }

    pub fn drain(&self) -> Vec<f32> {
        let mut samples = self.samples.lock().unwrap();
        samples.drain(..).collect()
    }

    pub fn clear(&self) {
        self.samples.lock().unwrap().clear();
    }

    pub fn len(&self) -> usize {
        self.samples.lock().unwrap().len()
    }

    pub fn is_empty(&self) -> bool {
        self.samples.lock().unwrap().is_empty()
    }

    pub fn duration_seconds(&self, sample_rate: u32) -> f64 {
        self.len() as f64 / sample_rate as f64
    }
}
```

### Step 2: Add Loading States Component

**`src/components/LoadingStates.tsx`:**
```tsx
import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const Spinner = ({ size = 'md', color = 'blue' }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-${color}-200 border-t-${color}-500 rounded-full animate-spin`}
    />
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

interface PulsingDotProps {
  color?: string;
}

export const PulsingDot = ({ color = 'red' }: PulsingDotProps) => (
  <span className="relative flex h-3 w-3">
    <span
      className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color}-400 opacity-75`}
    />
    <span
      className={`relative inline-flex rounded-full h-3 w-3 bg-${color}-500`}
    />
  </span>
);

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
}

export const ProgressBar = ({ progress, showLabel = false }: ProgressBarProps) => (
  <div className="w-full">
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
    {showLabel && (
      <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progress)}%</p>
    )}
  </div>
);
```

### Step 3: Add Keyboard Navigation

**`src/hooks/useKeyboardNavigation.ts`:**
```typescript
import { useEffect, useCallback } from 'react';

interface KeyboardHandlers {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onTab?: (shiftKey: boolean) => void;
}

export function useKeyboardNavigation(handlers: KeyboardHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          handlers.onEscape?.();
          break;
        case 'Enter':
          handlers.onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          handlers.onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          handlers.onArrowDown?.();
          break;
        case 'Tab':
          if (handlers.onTab) {
            event.preventDefault();
            handlers.onTab(event.shiftKey);
          }
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

### Step 4: Add Focus Management

**`src/hooks/useFocusTrap.ts`:**
```typescript
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}
```

### Step 5: Add Reduced Motion Support

**`src/hooks/useReducedMotion.ts`:**
```typescript
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}
```

**`src/lib/motion.ts`:**
```typescript
// Animation variants with reduced motion support
export const fadeInOut = (reducedMotion: boolean) => ({
  initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 },
  transition: { duration: reducedMotion ? 0 : 0.2 },
});

export const scaleInOut = (reducedMotion: boolean) => ({
  initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
  transition: { duration: reducedMotion ? 0 : 0.2 },
});
```

### Step 6: Add Performance Monitoring

**`src/lib/performance.ts`:**
```typescript
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  end(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric) return undefined;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    console.debug(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`);
    return metric.duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  clear(): void {
    this.metrics.clear();
  }

  report(): Record<string, number> {
    const report: Record<string, number> = {};
    this.metrics.forEach((metric, name) => {
      if (metric.duration) {
        report[name] = metric.duration;
      }
    });
    return report;
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### Step 7: Memory Cleanup

**`src/hooks/useCleanup.ts`:**
```typescript
import { useEffect, useRef } from 'react';

export function useCleanup(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

---

## Testing Checklist

### Error Handling Tests

```typescript
// src/__tests__/errorHandling.test.ts

describe('Error Handling', () => {
  test('shows error toast on API failure', async () => {
    // Mock API failure
    // Verify toast appears
  });

  test('retry button works for network errors', async () => {
    // Mock network error
    // Click retry
    // Verify retry attempt
  });

  test('redirects to settings on API key error', async () => {
    // Mock invalid API key error
    // Click action button
    // Verify settings opened
  });
});
```

### Performance Tests

```typescript
// src/__tests__/performance.test.ts

describe('Performance', () => {
  test('recording starts within 100ms', async () => {
    const start = performance.now();
    await startRecording();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('no memory leaks after 10 recordings', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize;
    
    for (let i = 0; i < 10; i++) {
      await startRecording();
      await stopRecording();
    }
    
    // Force GC if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize;
    expect(finalMemory).toBeLessThan(initialMemory * 1.5);
  });
});
```

---

## Final Polish Checklist

### UI/UX
- [ ] All animations are smooth (60fps)
- [ ] Reduced motion is respected
- [ ] Focus states are visible
- [ ] Keyboard navigation works everywhere
- [ ] Screen reader compatible
- [ ] Dark mode works (if implemented)

### Error Handling
- [ ] Network errors show toast with retry
- [ ] API key errors redirect to settings
- [ ] Rate limits show appropriate message
- [ ] Offline state is indicated
- [ ] Microphone permission errors are helpful

### Performance
- [ ] App starts in < 2 seconds
- [ ] Recording starts in < 100ms
- [ ] No memory leaks
- [ ] CPU usage < 5% when idle
- [ ] Database queries are fast

### Accessibility
- [ ] All interactive elements are focusable
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces state changes
- [ ] Error messages are descriptive

---

## Verification Checklist

Before moving to Phase 8, verify:

- [ ] All error scenarios are handled gracefully
- [ ] Offline state is detected and shown
- [ ] Retry logic works for failed requests
- [ ] Animations respect reduced motion preference
- [ ] Keyboard navigation works throughout app
- [ ] Focus is trapped in modals
- [ ] Performance metrics are within targets
- [ ] No console errors in normal usage

---

## Next Steps

After completing Phase 7, proceed to [Phase 8: Distribution & Deployment](./PHASE_8_DISTRIBUTION.md)
