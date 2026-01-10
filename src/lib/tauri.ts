import { invoke } from '@tauri-apps/api/core';

// Recording functions
export async function getMicrophones(): Promise<string[]> {
  return invoke('get_microphones');
}

export async function getDefaultMicrophone(): Promise<string> {
  return invoke('get_default_microphone');
}

export async function startRecording(): Promise<void> {
  return invoke('start_recording');
}

export async function stopRecording(): Promise<number[]> {
  return invoke('stop_recording');
}

export async function isRecording(): Promise<boolean> {
  return invoke('is_recording');
}

// API functions
export async function transcribe(
  audioData: number[],
  apiKey: string,
  language: string
): Promise<string> {
  return invoke('transcribe', { audioData, apiKey, language });
}

export async function polish(rawText: string, apiKey: string): Promise<string> {
  return invoke('polish', { rawText, apiKey });
}

export interface TranscriptionResult {
  raw_text: string;
  polished_text: string | null;
}

export async function transcribeAndPolish(
  audioData: number[],
  apiKey: string,
  language: string,
  shouldPolish: boolean
): Promise<TranscriptionResult> {
  return invoke('transcribe_and_polish', { audioData, apiKey, language, shouldPolish });
}

// Hotkey functions
export async function setGlobalHotkey(hotkey: string): Promise<void> {
  return invoke('set_global_hotkey', { hotkey });
}

export async function clearGlobalHotkey(): Promise<void> {
  return invoke('clear_global_hotkey');
}

export async function checkHotkeyAvailable(hotkey: string): Promise<boolean> {
  return invoke('check_hotkey_available', { hotkey });
}

// Clipboard functions
export async function paste(text: string, restoreClipboard: boolean): Promise<void> {
  return invoke('paste', { text, restoreClipboard });
}

export async function copy(text: string): Promise<void> {
  return invoke('copy', { text });
}

export async function getClipboard(): Promise<string> {
  return invoke('get_clipboard');
}

// Tray functions
export async function setTrayRecording(): Promise<void> {
  return invoke('set_tray_recording');
}

export async function setTrayProcessing(): Promise<void> {
  return invoke('set_tray_processing');
}

export async function setTrayIdle(): Promise<void> {
  return invoke('set_tray_idle');
}

// Database - History
export interface HistoryItem {
  id: number;
  raw_text: string;
  polished_text: string | null;
  duration_seconds: number | null;
  word_count: number | null;
  language: string;
  created_at: string;
}

export interface NewHistoryItem {
  raw_text: string;
  polished_text?: string;
  duration_seconds?: number;
  language: string;
}

export async function dbAddHistory(item: NewHistoryItem): Promise<number> {
  return invoke('db_add_history', { item });
}

export async function dbGetHistory(limit?: number, offset?: number): Promise<HistoryItem[]> {
  return invoke('db_get_history', { limit, offset });
}

export async function dbDeleteHistory(id: number): Promise<boolean> {
  return invoke('db_delete_history', { id });
}

export async function dbClearHistory(): Promise<number> {
  return invoke('db_clear_history');
}

export async function dbSearchHistory(query: string, limit?: number): Promise<HistoryItem[]> {
  return invoke('db_search_history', { query, limit });
}

export async function dbGetHistoryCount(): Promise<number> {
  return invoke('db_get_history_count');
}

// Database - Dictionary
export interface DictionaryWord {
  id: number;
  word: string;
  pronunciation: string | null;
  category: string | null;
  created_at: string;
}

export interface NewDictionaryWord {
  word: string;
  pronunciation?: string | null;
  category?: string | null;
}

export async function dbAddDictionaryWord(word: NewDictionaryWord): Promise<number> {
  return invoke('db_add_dictionary_word', { word });
}

export async function dbGetDictionary(): Promise<DictionaryWord[]> {
  return invoke('db_get_dictionary');
}

export async function dbDeleteDictionaryWord(id: number): Promise<boolean> {
  return invoke('db_delete_dictionary_word', { id });
}

export async function dbGetDictionaryPrompt(): Promise<string> {
  return invoke('db_get_dictionary_prompt');
}

export async function dbImportDictionary(words: NewDictionaryWord[]): Promise<number> {
  return invoke('db_import_dictionary', { words });
}

export async function dbExportDictionary(): Promise<NewDictionaryWord[]> {
  return invoke('db_export_dictionary');
}

// Database - Snippets
export interface Snippet {
  id: number;
  trigger_phrase: string;
  content: string;
  use_count: number;
  created_at: string;
}

export interface NewSnippet {
  trigger_phrase: string;
  content: string;
}

export interface ProcessedSnippetResult {
  text: string;
  snippets_used: number;
}

export async function dbAddSnippet(snippet: NewSnippet): Promise<number> {
  return invoke('db_add_snippet', { snippet });
}

export async function dbGetSnippets(): Promise<Snippet[]> {
  return invoke('db_get_snippets');
}

export async function dbDeleteSnippet(id: number): Promise<boolean> {
  return invoke('db_delete_snippet', { id });
}

export async function dbProcessSnippets(text: string): Promise<ProcessedSnippetResult> {
  return invoke('db_process_snippets', { text });
}
