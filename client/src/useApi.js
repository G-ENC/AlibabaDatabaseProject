import { useEffect, useState } from 'react';
import { api } from './api.js';

// Loads data from a GET path. Re-loads when the path changes or reload() is called.
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api
      .get(path)
      .then((data) => !cancelled && setState({ data, loading: false, error: '' }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
