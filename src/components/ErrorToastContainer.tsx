import { AnimatePresence } from 'framer-motion';
import { ErrorToast } from './ErrorToast';
import { useErrorStore } from '../stores/errorStore';

export const ErrorToastContainer = () => {
  const { errors, removeError } = useErrorStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      <AnimatePresence>
        {errors.map((error) => (
          <ErrorToast
            key={error.id}
            message={error.message}
            type={error.type}
            action={error.action}
            onDismiss={() => removeError(error.id)}
            duration={error.duration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
