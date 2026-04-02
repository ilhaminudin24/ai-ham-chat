import { useEffect, useRef, useState, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

interface SwipeState {
  /** Current horizontal swipe offset in pixels (positive = right) */
  offsetX: number;
  /** Whether user is actively swiping */
  isSwiping: boolean;
}

export function useSwipeGesture<T extends HTMLElement>(options: SwipeOptions) {
  const ref = useRef<T>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isTracking = useRef(false);

  const [swipeState, setSwipeState] = useState<SwipeState>({ offsetX: 0, isSwiping: false });

  const resetState = useCallback(() => {
    setSwipeState({ offsetX: 0, isSwiping: false });
    isTracking.current = false;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || options.enabled === false) return;

    const threshold = options.threshold ?? 80;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      isTracking.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;

      // Only track if horizontal movement > vertical (swipe, not scroll)
      if (!isTracking.current) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isTracking.current = true;
        } else if (Math.abs(deltaY) > 10) {
          // Vertical scroll — don't track
          return;
        } else {
          return;
        }
      }

      if (isTracking.current) {
        // Clamp offset: max 120px in either direction, with rubber-band damping
        const damped = deltaX > 0
          ? Math.min(deltaX * 0.5, 60)
          : Math.max(deltaX * 0.5, -60);
        setSwipeState({ offsetX: damped, isSwiping: true });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const elapsed = Date.now() - touchStartTime.current;

      // Reset visual state
      resetState();

      // Only fire callback if it was a proper horizontal swipe within time limit
      if (Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 500) {
        if (deltaX > threshold && options.onSwipeRight) {
          options.onSwipeRight();
          if (navigator.vibrate) navigator.vibrate(10);
        } else if (deltaX < -threshold && options.onSwipeLeft) {
          options.onSwipeLeft();
          if (navigator.vibrate) navigator.vibrate(10);
        }
      }
    };

    const handleTouchCancel = () => {
      resetState();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [options, resetState]);

  return { ref, swipeState };
}
