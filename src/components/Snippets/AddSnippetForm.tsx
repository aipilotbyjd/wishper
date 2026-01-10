import { useState } from 'react';
import { motion } from 'framer-motion';
import type { NewSnippet } from '../../lib/tauri';

interface AddSnippetFormProps {
  onAdd: (snippet: NewSnippet) => Promise<void>;
  onClose: () => void;
}

export const AddSnippetForm = ({ onAdd, onClose }: AddSnippetFormProps) => {
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhrase.trim()) {
      setError('Trigger phrase is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd({
        trigger_phrase: triggerPhrase.trim(),
        content: content.trim(),
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
        <h3 className="text-lg font-semibold text-white mb-4">Add Snippet</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Trigger Phrase *</label>
            <input
              type="text"
              value={triggerPhrase}
              onChange={(e) => setTriggerPhrase(e.target.value)}
              placeholder="e.g., insert signature"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
            <p className="text-xs text-white/40 mt-1">Say this phrase to insert the content</p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The text to insert..."
              rows={4}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
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
              {loading ? 'Adding...' : 'Add Snippet'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
