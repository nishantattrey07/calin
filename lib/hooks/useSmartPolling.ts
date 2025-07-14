import { useCallback, useEffect, useRef, useState } from 'react';

export function useSmartPolling(callback: () => void, baseInterval = 30000) {
  const [isActive, setIsActive] = useState(true);
  const [lastAction, setLastAction] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Updating callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const calculateInterval = useCallback(() => {
    if (!isActive) return null; // Don't poll if tab inactive
    
    const timeSinceAction = Date.now() - lastAction;
    
    // Aggressive polling right after user action
    if (timeSinceAction < 10000) return 2000; // 2s
    if (timeSinceAction < 60000) return 10000; // 10s
    return baseInterval; // 30s default
  }, [isActive, lastAction, baseInterval]);

  const startPolling = useCallback(() => {
    const poll = () => {
      const interval = calculateInterval();
      if (interval) {
        intervalRef.current = setTimeout(() => {
          callbackRef.current(); 
          poll(); // Recursive polling
        }, interval);
      }
    };
    poll();
  }, [calculateInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Visibility detection
    const handleVisibilityChange = () => {
      const newIsActive = !document.hidden;
      setIsActive(newIsActive);
      
      if (newIsActive) {
        console.log('👁️ Tab visible - resuming smart polling');
        startPolling();
      } else {
        console.log('😴 Tab hidden - pausing polling');
        stopPolling();
      }
    };

    // User activity detection
    const handleUserActivity = () => {
      setLastAction(Date.now());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    
    // Start initial polling
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
    };
  }, [startPolling, stopPolling]);

  const triggerAction = useCallback(() => {
    console.log('🚀 User action detected - triggering immediate polling');
    setLastAction(Date.now());
    stopPolling();
    setTimeout(startPolling, 100); // Restart with new aggressive timing
  }, [startPolling, stopPolling]);

  return { 
    triggerAction,
    isActive,
    lastAction 
  };
}
