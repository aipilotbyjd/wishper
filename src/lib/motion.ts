// Animation variants with reduced motion support

export const fadeInOut = (reducedMotion: boolean) => ({
  initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 },
  transition: { duration: reducedMotion ? 0 : 0.2 },
});

export const scaleInOut = (reducedMotion: boolean) => ({
  initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
  transition: { duration: reducedMotion ? 0 : 0.2 },
});

export const slideIn = (reducedMotion: boolean, direction: 'left' | 'right' | 'up' | 'down' = 'up') => {
  const offset = { left: { x: -20 }, right: { x: 20 }, up: { y: 20 }, down: { y: -20 } }[direction];
  return {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, ...offset },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, ...offset },
    transition: { duration: reducedMotion ? 0 : 0.2 },
  };
};
