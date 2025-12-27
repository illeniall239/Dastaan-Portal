import { useEffect, useRef, useState } from 'react';

interface UseFormTimeTrackingOptions {
  enabled?: boolean;
  onTimeUpdate?: (minutes: number) => void;
  initialTime?: number; // For loading from drafts
}

/**
 * Tracks active time spent on a form
 *
 * Features:
 * - Pauses on tab/window blur
 * - Resumes on focus
 * - Accumulates time across sessions (via initialTime)
 * - Updates every 15 seconds
 *
 * @param options - Configuration options
 * @param options.enabled - Whether tracking is enabled (default: true)
 * @param options.onTimeUpdate - Callback fired when time updates
 * @param options.initialTime - Initial accumulated time in minutes (for loading from drafts)
 * @returns accumulatedMinutes - Total minutes spent
 */
export function useFormTimeTracking({
  enabled = true,
  onTimeUpdate,
  initialTime = 0,
}: UseFormTimeTrackingOptions = {}): number {
  const [accumulatedMinutes, setAccumulatedMinutes] = useState(initialTime);
  const [isActive, setIsActive] = useState(true);

  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const accumulatedSecondsRef = useRef(initialTime * 60);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause and accumulate time
        setIsActive(false);
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        accumulatedSecondsRef.current += elapsed;
      } else {
        // Tab visible - resume tracking
        setIsActive(true);
        startTimeRef.current = Date.now();
      }
    };

    const handleBlur = () => {
      setIsActive(false);
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      accumulatedSecondsRef.current += elapsed;
    };

    const handleFocus = () => {
      setIsActive(true);
      startTimeRef.current = Date.now();
    };

    // Update accumulated time every 15 seconds
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const totalSeconds = accumulatedSecondsRef.current + elapsed;
        const minutes = Math.floor(totalSeconds / 60);

        setAccumulatedMinutes(minutes);

        if (onTimeUpdate && minutes > 0) {
          onTimeUpdate(minutes);
        }

        // Reset start time for next interval
        accumulatedSecondsRef.current = totalSeconds;
        startTimeRef.current = Date.now();
      }
    }, 15000); // Update every 15 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);

      // Final accumulation on unmount
      if (!document.hidden) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        accumulatedSecondsRef.current += elapsed;
      }
    };
  }, [enabled, onTimeUpdate]);

  return accumulatedMinutes;
}
