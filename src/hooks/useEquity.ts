import { useEffect, useState } from 'react';
import { getEquity, type EquityPoint } from '../api/bot';
import { useAuth } from '../context/AuthContext';

export interface EquityHook {
  equity: EquityPoint[];
  stale: boolean;
  error: string | null;
}

// Returns real equity points from /bot/equity. A failed fetch is reported via
// `stale` rather than being covered up with invented numbers.
export function useEquity(): EquityHook {
  const { token } = useAuth();
  const [equity, setEquity] = useState<EquityPoint[]>([]);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: switch this to a WebSocket subscription when the backend supports it.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getEquity(token);
        if (cancelled) return;
        setEquity(data);
        setStale(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // Keep the last good series, but flag it so the UI can warn.
        setStale(true);
        setError(
          err instanceof Error ? err.message : 'Could not refresh equity data.'
        );
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  return { equity, stale, error };
}
