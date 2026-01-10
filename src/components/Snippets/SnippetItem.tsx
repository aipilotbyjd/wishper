import { useState } from 'react';
import type { Snippet } from '../../lib/tauri';

interface SnippetItemProps {
  snippet: Snippet;
  onDelete: () => void;
}

export const SnippetItem = ({ snippet, onDelete }: SnippetItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
              "{snippet.trigger_phrase}"
            </span>
            {snippet.use_count > 0 && (
              <span className="text-xs text-white/40">
                Used {snippet.use_count} time{snippet.use_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className={`text-white/70 mt-2 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
            {snippet.content}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ml-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
