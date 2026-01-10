import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' };
  return (
    <div className={`${sizes[size]} border-white/20 border-t-purple-500 rounded-full animate-spin ${className}`} />
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`} />
);

export const PulsingDot = ({ className = '' }: { className?: string }) => (
  <span className={`relative flex h-3 w-3 ${className}`}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
  </span>
);

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar = ({ progress, showLabel = false, className = '' }: ProgressBarProps) => (
  <div className={`w-full ${className}`}>
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
    {showLabel && (
      <p className="text-xs text-white/40 mt-1 text-right">{Math.round(progress)}%</p>
    )}
  </div>
);

export const RecordingIndicator = () => (
  <div className="flex items-center gap-2">
    <PulsingDot />
    <span className="text-sm text-white/80 font-medium">Recording...</span>
  </div>
);

export const ProcessingIndicator = () => (
  <div className="flex items-center gap-2">
    <Spinner size="sm" />
    <span className="text-sm text-white/80 font-medium">Processing...</span>
  </div>
);
