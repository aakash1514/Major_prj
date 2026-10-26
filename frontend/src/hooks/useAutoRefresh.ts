import { useEffect, useRef } from 'react';

/**
 * Calls `refresh` every `intervalMs` while the tab is visible, and right away
 * when the user comes back to the tab, so admin lists pick up new orders and
 * crop submissions without a manual page reload. Overlapping calls are skipped.
 */
export function useAutoRefresh(refresh: () => Promise<unknown> | void, intervalMs = 10000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let inFlight = false;

    const run = async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        await refreshRef.current();
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(run, intervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [intervalMs]);
}
