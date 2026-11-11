import { useEffect, useState } from 'preact/hooks';
import type { AppState, Store } from './store';

/** Re-renders the calling component whenever the store changes. */
export function useStore(store: Store): AppState {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setVersion((version) => version + 1);
    });
    // Catch changes made between render and subscription.
    setVersion((version) => version + 1);
    return unsubscribe;
  }, [store]);
  return store.getState();
}
