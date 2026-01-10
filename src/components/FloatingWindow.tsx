import { motion, AnimatePresence } from 'framer-motion';
import { useRecordingStore } from '../stores/recordingStore';

export const FloatingWindow = () => {
  const { state, transcript } = useRecordingStore();

  if (state === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-black/90 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3">
            {state === 'recording' && (
              <>
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-white font-medium">Listening...</span>
              </>
            )}

            {state === 'processing' && (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white font-medium">Processing...</span>
              </>
            )}

            {state === 'done' && (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white font-medium">Done!</span>
              </>
            )}
          </div>

          {transcript && state === 'done' && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-white/70 text-sm mt-3 max-w-md line-clamp-2"
            >
              {transcript}
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
