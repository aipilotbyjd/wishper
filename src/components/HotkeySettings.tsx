import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { invoke } from '@tauri-apps/api/core';

const PRESET_HOTKEYS = [
  { label: 'Cmd+Shift+Space', value: 'CommandOrControl+Shift+Space' },
  { label: 'Cmd+Shift+D', value: 'CommandOrControl+Shift+D' },
  { label: 'Cmd+Option+Space', value: 'CommandOrControl+Alt+Space' },
];

export const HotkeySettings = () => {
  const { hotkey, setHotkey } = useSettingsStore();
  const [selectedHotkey, setSelectedHotkey] = useState(hotkey);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      setIsChecking(true);
      try {
        const available = await invoke<boolean>('check_hotkey_available', { hotkey: selectedHotkey });
        setIsAvailable(available);
      } catch {
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, [selectedHotkey]);

  const handleSave = async () => {
    try {
      await invoke('set_global_hotkey', { hotkey: selectedHotkey });
      setHotkey(selectedHotkey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to set hotkey:', err);
    }
  };

  const hasChanges = selectedHotkey !== hotkey;

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
        Global Hotkey
      </label>

      <div className="space-y-2">
        {PRESET_HOTKEYS.map((preset) => (
          <label
            key={preset.value}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              selectedHotkey === preset.value
                ? 'bg-purple-500/20 border border-purple-500/50'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
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
                ? 'border-purple-500 bg-purple-500' 
                : 'border-white/30'
            }`}>
              {selectedHotkey === preset.value && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className="font-mono text-sm text-white/80">{preset.label}</span>
          </label>
        ))}
      </div>

      {isChecking && (
        <p className="text-xs text-white/50">Checking availability...</p>
      )}

      {!isChecking && isAvailable === false && (
        <p className="text-xs text-red-400">This hotkey is already in use</p>
      )}

      <button
        onClick={handleSave}
        disabled={!hasChanges || isAvailable === false}
        className={`w-full px-4 py-2 rounded-xl font-medium text-sm transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : hasChanges && isAvailable !== false
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
        }`}
      >
        {saved ? 'Saved!' : 'Update Hotkey'}
      </button>

      <p className="text-xs text-white/40">
        Press the hotkey anywhere to start/stop recording
      </p>
    </div>
  );
};
