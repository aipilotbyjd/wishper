import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DictionaryWord } from './DictionaryWord';
import { AddWordForm } from './AddWordForm';
import {
  dbGetDictionary,
  dbAddDictionaryWord,
  dbDeleteDictionaryWord,
  dbExportDictionary,
  dbImportDictionary,
  type DictionaryWord as DictionaryWordType,
  type NewDictionaryWord,
} from '../../lib/tauri';

interface DictionaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['name', 'technical', 'acronym', 'other'];

export const DictionaryPanel = ({ isOpen, onClose }: DictionaryPanelProps) => {
  const [words, setWords] = useState<DictionaryWordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadDictionary();
  }, [isOpen]);

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const data = await dbGetDictionary();
      setWords(data);
    } catch (err) {
      console.error('Failed to load dictionary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (word: NewDictionaryWord) => {
    await dbAddDictionaryWord(word);
    await loadDictionary();
    setShowAddForm(false);
  };

  const handleDeleteWord = async (id: number) => {
    await dbDeleteDictionaryWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleExport = async () => {
    const data = await dbExportDictionary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wishper-dictionary.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text) as NewDictionaryWord[];
        const imported = await dbImportDictionary(data);
        alert(`Imported ${imported} words`);
        await loadDictionary();
      } catch {
        alert('Failed to import. Check file format.');
      }
    };
    input.click();
  };

  const filteredWords = filter ? words.filter((w) => w.category === filter) : words;

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
              <h2 className="text-lg font-semibold text-white">Personal Dictionary</h2>
              <p className="text-xs text-white/50">{words.length} words for better recognition</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilter(null)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  filter === null ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
                    filter === cat ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleImport} className="px-2.5 py-1 text-xs bg-white/5 text-white/60 rounded-lg hover:bg-white/10">
                Import
              </button>
              <button onClick={handleExport} className="px-2.5 py-1 text-xs bg-white/5 text-white/60 rounded-lg hover:bg-white/10">
                Export
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-2.5 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Add Word
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {filter ? `No ${filter} words` : 'No words yet. Add technical terms, names, and acronyms.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWords.map((word) => (
                  <DictionaryWord key={word.id} word={word} onDelete={() => handleDeleteWord(word.id)} />
                ))}
              </div>
            )}
          </div>

          {showAddForm && <AddWordForm onAdd={handleAddWord} onClose={() => setShowAddForm(false)} />}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
