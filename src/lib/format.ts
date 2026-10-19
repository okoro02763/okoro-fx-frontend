export function decimalsFor(price: number): number {
  if (price >= 100) return 2;
  if (price >= 1) return 4;
  if (price >= 0.01) return 5;
  return 6;
}

export function formatPrice(price: number): string {
  const d = decimalsFor(price);
  return price.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Format a wallet balance as currency.
 *
 * Defensive on purpose: the backend may send the balance as a number, a
 * numeric string, or (historically) nothing at all -- and printing a raw
 * fallback like "NO" was exactly the bug this replaces. Anything that is not
 * a finite number renders as $0.00.
 */
export function formatCurrency(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(n);
}

export function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Clock time as HH:MM (local), used for trade open/expiry labels. */
export function formatClock(value: number | string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}
