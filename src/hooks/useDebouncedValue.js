import { useState, useEffect } from 'react';

// Delays updating the returned value until the input has stopped changing
// for `delay` ms — used for search inputs now that search hits the server
// instead of filtering data already in memory.
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
