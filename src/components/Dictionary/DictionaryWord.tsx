import type { DictionaryWord as DictionaryWordType } from '../../lib/tauri';

interface DictionaryWordProps {
  word: DictionaryWordType;
  onDelete: () => void;
}

export const DictionaryWord = ({ word, onDelete }: DictionaryWordProps) => {
  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'name': return 'bg-purple-500/20 text-purple-300';
      case 'technical': return 'bg-blue-500/20 text-blue-300';
      case 'acronym': return 'bg-green-500/20 text-green-300';
      default: return 'bg-white/10 text-white/60';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
      <div className="flex items-center gap-3">
        <span className="font-medium text-white">{word.word}</span>
        {word.pronunciation && (
          <span className="text-sm text-white/40 italic">/{word.pronunciation}/</span>
        )}
        {word.category && (
          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getCategoryColor(word.category)}`}>
            {word.category}
          </span>
        )}
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
