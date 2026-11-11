import { useEffect, useState } from 'preact/hooks';
const IDLE = { state: 'idle' } as const;

/** Re-renders on runner changes; without a runner the search stays idle. */
export function useRunner<Run>(
  runner:
    | {
        getRun(): Run;
        subscribe(listener: () => void): () => void;
      }
    | undefined,
): Run | typeof IDLE {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (runner === undefined) {
      return undefined;
    }
    const unsubscribe = runner.subscribe(() => {
      setVersion((version) => version + 1);
    });
    setVersion((version) => version + 1);
    return unsubscribe;
  }, [runner]);
  return runner?.getRun() ?? IDLE;
}
