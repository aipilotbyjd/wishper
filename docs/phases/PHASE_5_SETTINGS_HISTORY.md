# Phase 5: Settings & History UI (Week 5)

> **Duration:** Days 29-35
> **Goal:** Build comprehensive Settings panel and History view with search functionality

---

## Day 29-31: Settings Panel

### Step 1: Create Settings Modal Component

**`src/components/Settings/SettingsModal.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeneralSettings } from './GeneralSettings';
import { HotkeySettings } from './HotkeySettings';
import { AudioSettings } from './AudioSettings';
import { AboutSettings } from './AboutSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'hotkey' | 'audio' | 'about';

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'hotkey', label: 'Hotkey', icon: '⌨️' },
    { id: 'audio', label: 'Audio', icon: '🎤' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex h-[500px]">
            {/* Sidebar */}
            <div className="w-48 border-r bg-gray-50 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'hotkey' && <HotkeySettings />}
              {activeTab === 'audio' && <AudioSettings />}
              {activeTab === 'about' && <AboutSettings />}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
```

### Step 2: Create General Settings

**`src/components/Settings/GeneralSettings.tsx`:**
```tsx
import { useSettingsStore } from '../../stores/settingsStore';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export const GeneralSettings = () => {
  const {
    apiKey,
    setApiKey,
    language,
    setLanguage,
    shouldPolish,
    setShouldPolish,
    autoPaste,
    setAutoPaste,
    restoreClipboard,
    setRestoreClipboard,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">General Settings</h3>

      {/* API Key */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          OpenAI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          Get your API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            OpenAI Platform
          </a>
        </p>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shouldPolish}
            onChange={(e) => setShouldPolish(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-700">Polish text with AI</span>
            <p className="text-sm text-gray-500">
              Remove filler words, add punctuation, fix grammar
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPaste}
            onChange={(e) => setAutoPaste(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-700">Auto-paste text</span>
            <p className="text-sm text-gray-500">
              Automatically paste transcribed text into active application
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={restoreClipboard}
            onChange={(e) => setRestoreClipboard(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-700">Restore clipboard</span>
            <p className="text-sm text-gray-500">
              Restore previous clipboard content after pasting
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
```

### Step 3: Create Hotkey Settings

**`src/components/Settings/HotkeySettings.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { setGlobalHotkey, checkHotkeyAvailable } from '../../lib/tauri';

const PRESET_HOTKEYS = [
  { label: 'Cmd+Shift+Space', value: 'CommandOrControl+Shift+Space' },
  { label: 'Cmd+Shift+D', value: 'CommandOrControl+Shift+D' },
  { label: 'Cmd+Option+Space', value: 'CommandOrControl+Alt+Space' },
  { label: 'Ctrl+Shift+Space', value: 'Control+Shift+Space' },
];

export const HotkeySettings = () => {
  const { hotkey, setHotkey } = useSettingsStore();
  const [selectedHotkey, setSelectedHotkey] = useState(hotkey);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (selectedHotkey === hotkey) {
        setStatus('idle');
        return;
      }

      setStatus('checking');
      try {
        const available = await checkHotkeyAvailable(selectedHotkey);
        setStatus(available ? 'available' : 'unavailable');
      } catch {
        setStatus('unavailable');
      }
    };

    check();
  }, [selectedHotkey, hotkey]);

  const handleSave = async () => {
    if (status === 'unavailable') return;

    setIsSaving(true);
    try {
      await setGlobalHotkey(selectedHotkey);
      setHotkey(selectedHotkey);
      setStatus('idle');
    } catch (err) {
      console.error('Failed to set hotkey:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Hotkey Settings</h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Global Hotkey
        </label>
        <p className="text-sm text-gray-500">
          Press this key combination from anywhere to start/stop recording
        </p>
      </div>

      <div className="space-y-2">
        {PRESET_HOTKEYS.map((preset) => (
          <label
            key={preset.value}
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              selectedHotkey === preset.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="hotkey"
              value={preset.value}
              checked={selectedHotkey === preset.value}
              onChange={(e) => setSelectedHotkey(e.target.value)}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedHotkey === preset.value
                ? 'border-blue-500'
                : 'border-gray-300'
            }`}>
              {selectedHotkey === preset.value && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
            <span className="font-mono text-sm font-medium">{preset.label}</span>
            {hotkey === preset.value && (
              <span className="ml-auto text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                Current
              </span>
            )}
          </label>
        ))}
      </div>

      {/* Status indicator */}
      {status !== 'idle' && selectedHotkey !== hotkey && (
        <div className={`flex items-center gap-2 text-sm ${
          status === 'checking' ? 'text-gray-500' :
          status === 'available' ? 'text-green-600' : 'text-red-600'
        }`}>
          {status === 'checking' && (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Checking availability...
            </>
          )}
          {status === 'available' && (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Hotkey is available
            </>
          )}
          {status === 'unavailable' && (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              This hotkey is already in use
            </>
          )}
        </div>
      )}

      {/* Save button */}
      {selectedHotkey !== hotkey && (
        <button
          onClick={handleSave}
          disabled={status === 'unavailable' || status === 'checking' || isSaving}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Hotkey'}
        </button>
      )}
    </div>
  );
};
```

### Step 4: Create Audio Settings

**`src/components/Settings/AudioSettings.tsx`:**
```tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { getMicrophones, getDefaultMicrophone } from '../../lib/tauri';

export const AudioSettings = () => {
  const { microphoneId, setMicrophoneId } = useSettingsStore();
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        const [mics, defaultMic] = await Promise.all([
          getMicrophones(),
          getDefaultMicrophone(),
        ]);
        setMicrophones(mics);
        if (!microphoneId || microphoneId === 'default') {
          setMicrophoneId(defaultMic);
        }
      } catch (err) {
        console.error('Failed to load microphones:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMicrophones();
  }, []);

  const handleTestMicrophone = async () => {
    setTestStatus('testing');
    // Simulate a test - in real implementation, you'd record a short sample
    setTimeout(() => {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Audio Settings</h3>

      {/* Microphone Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Input Device
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading microphones...
          </div>
        ) : (
          <select
            value={microphoneId}
            onChange={(e) => setMicrophoneId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {microphones.map((mic) => (
              <option key={mic} value={mic}>
                {mic}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Test Microphone */}
      <div className="space-y-2">
        <button
          onClick={handleTestMicrophone}
          disabled={testStatus === 'testing'}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {testStatus === 'testing' ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              Testing...
            </>
          ) : testStatus === 'success' ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Microphone works!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Test Microphone
            </>
          )}
        </button>
      </div>

      {/* Audio Tips */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips for better transcription</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Speak clearly and at a normal pace</li>
          <li>• Reduce background noise when possible</li>
          <li>• Keep the microphone at a consistent distance</li>
          <li>• Use an external microphone for best results</li>
        </ul>
      </div>
    </div>
  );
};
```

### Step 5: Create About Settings

**`src/components/Settings/AboutSettings.tsx`:**
```tsx
export const AboutSettings = () => {
  const version = '0.1.0';
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold">VoiceFlow</h3>
        <p className="text-gray-500">Version {version}</p>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Voice-to-text dictation with AI polishing</p>
        <p className="mt-2">Built with Tauri, React, and OpenAI</p>
      </div>

      <div className="border-t pt-4 space-y-3">
        <a
          href="https://github.com/yourusername/voiceflow"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span className="text-gray-700">View on GitHub</span>
        </a>

        <a
          href="https://platform.openai.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
          </svg>
          <span className="text-gray-700">OpenAI Platform</span>
        </a>
      </div>

      <div className="text-center text-xs text-gray-400 pt-4 border-t">
        <p>&copy; {year} VoiceFlow. All rights reserved.</p>
      </div>
    </div>
  );
};
```

---

## Day 32-35: History Panel

### Step 1: Create History Panel Component

**`src/components/History/HistoryPanel.tsx`:**
```tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HistoryItem } from './HistoryItem';
import { HistorySearch } from './HistorySearch';
import {
  dbGetHistory,
  dbSearchHistory,
  dbDeleteHistory,
  dbClearHistory,
  dbGetHistoryCount,
  type HistoryItem as HistoryItemType,
} from '../../lib/tauri';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryPanel = ({ isOpen, onClose }: HistoryPanelProps) => {
  const [items, setItems] = useState<HistoryItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const results = await dbSearchHistory(searchQuery, 50);
        setItems(results);
      } else {
        const [historyItems, count] = await Promise.all([
          dbGetHistory(pageSize, page * pageSize),
          dbGetHistoryCount(),
        ]);
        setItems(historyItems);
        setTotalCount(count);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const handleDelete = async (id: number) => {
    try {
      await dbDeleteHistory(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all history?')) return;

    try {
      await dbClearHistory();
      setItems([]);
      setTotalCount(0);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">History</h2>
              <p className="text-sm text-gray-500">{totalCount} dictations</p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b">
            <HistorySearch onSearch={handleSearch} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No results found' : 'No dictations yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!searchQuery && totalCount > pageSize && (
            <div className="px-6 py-3 border-t flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page + 1} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
```

### Step 2: Create History Item Component

**`src/components/History/HistoryItem.tsx`:**
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { copy } from '../../lib/tauri';
import type { HistoryItem as HistoryItemType } from '../../lib/tauri';

interface HistoryItemProps {
  item: HistoryItemType;
  onDelete: () => void;
}

export const HistoryItem = ({ item, onDelete }: HistoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayText = item.polished_text || item.raw_text;
  const previewText = displayText.slice(0, 150) + (displayText.length > 150 ? '...' : '');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleCopy = async () => {
    try {
      await copy(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      layout
      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className="text-gray-900">
            {isExpanded ? displayText : previewText}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{formatDate(item.created_at)}</span>
            {item.word_count && <span>{item.word_count} words</span>}
            {item.duration_seconds && (
              <span>{item.duration_seconds.toFixed(1)}s</span>
            )}
            <span className="uppercase">{item.language}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded view with raw text comparison */}
      <AnimatePresence>
        {isExpanded && item.polished_text && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="text-xs font-medium text-gray-500 mb-1">Original:</div>
            <p className="text-sm text-gray-600 italic">{item.raw_text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

### Step 3: Create History Search Component

**`src/components/History/HistorySearch.tsx`:**
```tsx
import { useState, useEffect } from 'react';

interface HistorySearchProps {
  onSearch: (query: string) => void;
}

export const HistorySearch = ({ onSearch }: HistorySearchProps) => {
  const [query, setQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search history..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};
```

### Step 4: Update App with Settings and History

**Update `src/App.tsx`:**
```tsx
import { useState } from 'react';
import { RecordButton } from './components/RecordButton';
import { FloatingWindow } from './components/FloatingWindow';
import { SettingsModal } from './components/Settings/SettingsModal';
import { HistoryPanel } from './components/History/HistoryPanel';
import { useRecordingStore } from './stores/recordingStore';
import { useHotkey } from './hooks/useHotkey';
import { useTauriEvent } from './hooks/useTauriEvents';
import './styles/globals.css';

function App() {
  const { error, transcript } = useRecordingStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize hotkey listener
  useHotkey();

  // Listen for tray menu events
  useTauriEvent('open_settings', () => setShowSettings(true));
  useTauriEvent('open_history', () => setShowHistory(true));

  return (
    <>
      <FloatingWindow />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">VoiceFlow</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="History"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <RecordButton />
            </div>

            {transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900">{transcript}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <p className="text-center text-sm text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Cmd+Shift+Space</kbd> to start
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
```

---

## Verification Checklist

Before moving to Phase 6, verify:

- [ ] Settings modal opens and closes properly
- [ ] All settings tabs work correctly
- [ ] Settings persist after app restart
- [ ] Hotkey changes take effect immediately
- [ ] History panel shows all dictations
- [ ] History search filters results correctly
- [ ] Individual history items can be deleted
- [ ] Clear all history works
- [ ] Copy to clipboard works from history
- [ ] Pagination works for large history

---

## Next Steps

After completing Phase 5, proceed to [Phase 6: Advanced Features](./PHASE_6_ADVANCED_FEATURES.md)
