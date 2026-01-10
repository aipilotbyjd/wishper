import { useEffect, useState } from 'react';
import { getMicrophones, getDefaultMicrophone } from '../lib/tauri';

export const MicrophoneSelector = () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/50 py-2">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
        <span className="text-sm">Loading microphones...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
        Input Device
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                     appearance-none cursor-pointer transition-all hover:bg-white/10"
        >
          {microphones.map((mic) => (
            <option key={mic} value={mic} className="bg-slate-800 text-white">
              {mic}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};
