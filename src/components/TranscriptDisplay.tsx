import { useRecordingStore } from '../stores/recordingStore';

export const TranscriptDisplay = () => {
  const { transcript, state } = useRecordingStore();

  if (!transcript && state !== 'processing') {
    return null;
  }

  const handleCopy = async () => {
    if (transcript) {
      await navigator.clipboard.writeText(transcript);
    }
  };

  return (
    <div className="mt-2 p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
          {state === 'processing' ? 'Processing...' : 'Transcript'}
        </h3>
        {transcript && (
          <button
            onClick={handleCopy}
            className="text-white/40 hover:text-white/70 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
      {state === 'processing' ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/50 text-sm">Transcribing...</span>
        </div>
      ) : (
        <p className="text-white/90 text-sm leading-relaxed">{transcript}</p>
      )}
    </div>
  );
};
