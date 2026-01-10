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

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const results = await dbSearchHistory(searchQuery, 50);
        setItems(results);
      } else {
        const [historyItems, count] = await Promise.all([
          dbGetHistory(50, 0),
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
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const handleDelete = async (id: number) => {
    try {
      await dbDeleteHistory(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete all history?')) return;
    try {
      await dbClearHistory();
      setItems([]);
      setTotalCount(0);
    } catch (err) {
      console.error('Failed to clear:', err);
    }
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
              <h2 className="text-lg font-semibold text-white">History</h2>
              <p className="text-xs text-white/50">{totalCount} dictations</p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
              <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-white/10">
            <HistorySearch onSearch={setSearchQuery} />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {searchQuery ? 'No results found' : 'No dictations yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <HistoryItem key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
