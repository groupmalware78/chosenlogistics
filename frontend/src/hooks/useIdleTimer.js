import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks user inactivity and fires callbacks when the user is idle.
 *
 * @param {object} opts
 * @param {() => void} opts.onWarning  - fired `warningMs` before timeout
 * @param {() => void} opts.onIdle     - fired after full `timeoutMs` of inactivity
 * @param {() => void} opts.onActivity - fired when activity resumes after a warning
 * @param {boolean}    opts.enabled    - only runs while true (e.g. when user is logged in)
 * @param {number}     opts.timeoutMs  - idle timeout in milliseconds
 * @param {number}     opts.warningMs  - how many ms before timeout to show the warning
 */
export function useIdleTimer({ onWarning, onIdle, onActivity, enabled, timeoutMs, warningMs }) {
  const idleRef = useRef(null);
  const warnRef = useRef(null);
  const isWarningRef = useRef(false);

  // Keep callbacks fresh without triggering effect restarts
  const callbacksRef = useRef({ onWarning, onIdle, onActivity });
  useEffect(() => {
    callbacksRef.current = { onWarning, onIdle, onActivity };
  });

  // reset is stable — only changes if the timeout durations change (they don't at runtime)
  const reset = useCallback(() => {
    clearTimeout(idleRef.current);
    clearTimeout(warnRef.current);

    // If we were in warning state and user became active, dismiss the warning
    if (isWarningRef.current) {
      isWarningRef.current = false;
      callbacksRef.current.onActivity?.();
    }

    warnRef.current = setTimeout(() => {
      isWarningRef.current = true;
      callbacksRef.current.onWarning?.();
    }, timeoutMs - warningMs);

    idleRef.current = setTimeout(() => {
      callbacksRef.current.onIdle?.();
    }, timeoutMs);
  }, [timeoutMs, warningMs]);

  useEffect(() => {
    if (!enabled) {
      clearTimeout(idleRef.current);
      clearTimeout(warnRef.current);
      isWarningRef.current = false;
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset(); // start the clock immediately on login

    return () => {
      events.forEach(e => document.removeEventListener(e, reset));
      clearTimeout(idleRef.current);
      clearTimeout(warnRef.current);
    };
  }, [enabled, reset]);
}
