import { useEffect, useState } from 'react';
import { getBotStatus, startBot, stopBot } from '../api/bot';
import { useAuth } from '../context/AuthContext';

export interface BotStatusHook {
  running: boolean;
  toggle: (next: boolean) => Promise<void>;
  busy: boolean;
  error: string | null;
}

// Controls bot start/stop state against the real /bot/* endpoints.
// Start/stop are admin-only, so a 403 is surfaced rather than swallowed.
export function useBotStatus(): BotStatusHook {
  const { token } = useAuth();
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getBotStatus(token)
      .then((s) => {
        if (!cancelled) {
          setRunning(s.running);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not read bot status.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggle = async (next: boolean) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (next) {
        await startBot(token);
      } else {
        await stopBot(token);
      }
      // Only reflect the change the server actually accepted.
      setRunning(next);
    } catch (err) {
      // Re-read the authoritative state instead of optimistically assuming.
      setError(
        err instanceof Error ? err.message : 'Could not update the bot.'
      );
      try {
        const s = await getBotStatus(token);
        setRunning(s.running);
      } catch {
        /* leave the last known value; the error is already surfaced */
      }
    } finally {
      setBusy(false);
    }
  };

  return { running, toggle, busy, error };
}
