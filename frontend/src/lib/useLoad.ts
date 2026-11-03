import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './format';

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((value) => alive && setData(value))
      .catch((err) => alive && setError(errorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run]);

  useEffect(reload, [reload]);
  return { data, error, loading, reload, setData };
}
