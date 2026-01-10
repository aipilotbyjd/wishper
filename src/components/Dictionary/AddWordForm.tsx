import { useState } from 'react';
import { motion } from 'framer-motion';
import type { NewDictionaryWord } from '../../lib/tauri';

interface AddWordFormProps {
  onAdd: (word: NewDictionaryWord) => Promise<void>;
  onClose: () => void;
}

export const AddWordForm = ({ onAdd, onClose }: AddWordFormProps) => {
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) {
      setError('Word is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd({
        word: word.trim(),
        pronunciation: pronunciation.trim() || null,
        category: category || null,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Add Word</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Word *</label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g., Kubernetes"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Pronunciation (optional)</label>
            <input
              type="text"
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder="e.g., koo-ber-NET-eez"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="">Select...</option>
              <option value="name">Name</option>
              <option value="technical">Technical</option>
              <option value="acronym">Acronym</option>
              <option value="other">Other</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/60 hover:bg-white/10 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Word'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
