import { useState, useEffect } from 'react';
import { getMicrophones, getDefaultMicrophone } from '../../lib/tauri';

export const AudioSettings = () => {
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        const [mics, defaultMic] = await Promise.all([
          getMicrophones(),
          getDefaultMicrophone(),
        ]);
        setMicrophones(mics);
        setSelected(defaultMic);
      } catch (err) {
        console.error('Failed to load microphones:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMicrophones();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Input Device</label>
        {loading ? (
          <div className="flex items-center gap-2 text-white/50 py-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
          >
            {microphones.map((mic) => (
              <option key={mic} value={mic} className="bg-slate-800">{mic}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <h4 className="font-medium text-purple-300 mb-2 text-sm">Tips for better transcription</h4>
        <ul className="text-xs text-purple-200/70 space-y-1">
          <li>• Speak clearly at a normal pace</li>
          <li>• Reduce background noise</li>
          <li>• Keep microphone at consistent distance</li>
          <li>• Use external mic for best results</li>
        </ul>
      </div>
    </div>
  );
};
