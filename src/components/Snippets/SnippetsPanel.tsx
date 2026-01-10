import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SnippetItem } from './SnippetItem';
import { AddSnippetForm } from './AddSnippetForm';
import {
  dbGetSnippets,
  dbAddSnippet,
  dbDeleteSnippet,
  type Snippet,
  type NewSnippet,
} from '../../lib/tauri';

interface SnippetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnippetsPanel = ({ isOpen, onClose }: SnippetsPanelProps) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen) loadSnippets();
  }, [isOpen]);

  const loadSnippets = async () => {
    setLoading(true);
    try {
      const data = await dbGetSnippets();
      setSnippets(data);
    } catch (err) {
      console.error('Failed to load snippets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSnippet = async (snippet: NewSnippet) => {
    await dbAddSnippet(snippet);
    await loadSnippets();
    setShowAddForm(false);
  };

  const handleDeleteSnippet = async (id: number) => {
    await dbDeleteSnippet(id);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-white">Voice Snippets</h2>
              <p className="text-xs text-white/50">Say trigger phrases to insert text</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Add Snippet
              </button>
              <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : snippets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">No snippets yet</p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left max-w-md mx-auto">
                  <h4 className="font-medium text-white/80 mb-2">Example Snippets</h4>
                  <ul className="text-sm text-white/50 space-y-2">
                    <li><span className="text-purple-400">"insert signature"</span> → Your email signature</li>
                    <li><span className="text-purple-400">"my address"</span> → Your physical address</li>
                    <li><span className="text-purple-400">"standard greeting"</span> → "Hi, hope this finds you well."</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {snippets.map((snippet) => (
                  <SnippetItem key={snippet.id} snippet={snippet} onDelete={() => handleDeleteSnippet(snippet.id)} />
                ))}
              </div>
            )}
          </div>

          {showAddForm && <AddSnippetForm onAdd={handleAddSnippet} onClose={() => setShowAddForm(false)} />}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
