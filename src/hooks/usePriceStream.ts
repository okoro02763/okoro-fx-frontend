import { useEffect, useRef, useState } from 'react';
import { priceSocketUrl } from '../api/binary';
import type { Quote } from '../types/binary';

type StreamMessage = (Quote | { type: string; symbol?: string }) & {
  type?: string;
};

/**
 * Subscribes to the backend price stream for a symbol.
 *
 * Returns the latest quote plus a connection status. The socket reconnects
 * with a small backoff and tears down cleanly when the symbol changes or the
 * component unmounts.
 */
export function usePriceStream(symbol: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol) return undefined;

    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    setQuote(null);
    setError(null);

    const connect = () => {
      if (closed) return;
      const socket = new WebSocket(priceSocketUrl(symbol));
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        setError(null);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamMessage;
          if (data.type === 'error') {
            setError('Unknown symbol');
            return;
          }
          if (data.type === 'snapshot' || data.type === 'tick') {
            const { type, ...rest } = data as Quote & { type?: string };
            void type;
            setQuote(rest as Quote);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onerror = () => {
        setError('Connection error');
      };

      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (closed) return;
        // Exponential-ish backoff capped at ~8s.
        attempt += 1;
        const delay = Math.min(8000, 500 * 2 ** Math.min(attempt, 4));
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [symbol]);

  return { quote, connected, error };
}

export default usePriceStream;
