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
 * a finite number renders as zero.
 *
 * The currency defaults to USD but the wallet is denominated in NGN, so
 * callers that know the account currency pass it in. An unknown currency
 * code falls back to USD rather than throwing.
 */
export function formatCurrency(value: unknown, currency = 'USD'): string {
  const n = typeof value === 'number' ? value : Number(value);
  const formatter = currencyFormatterFor(currency);
  if (!Number.isFinite(n)) {
    return formatter.format(0);
  }
  return formatter.format(n);
}

function currencyFormatterFor(currency: string): Intl.NumberFormat {
  if (!currency || currency === 'USD') {
    return currencyFormatter;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    });
  } catch {
    // Unknown/invalid currency code -- fall back instead of crashing the
    // page that wanted to display a balance.
    return currencyFormatter;
  }
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

/**
 * A Date shifted into the selected fixed UTC offset. Read it with the UTC
 * getters so the wall-clock value is independent of the browser timezone.
 */
export function shiftedDate(
  value: number | string | Date,
  offsetMinutes: number
): Date {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return new Date(t + offsetMinutes * 60_000);
}

/** Clock time as HH:MM in the selected UTC offset. */
export function formatClockTz(
  value: number | string | Date,
  offsetMinutes: number
): string {
  const d = shiftedDate(value, offsetMinutes);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`;
}

/** Full date + time in the selected UTC offset (for trade history). */
export function formatDateTimeTz(
  value: number | string | Date,
  offsetMinutes: number
): string {
  const d = shiftedDate(value, offsetMinutes);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${dd} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${d
    .getUTCHours()
    .toString()
    .padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
}

/** Duration as mm:ss, or hh:mm:ss when an hour or longer. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  }
  return `${m}:${r.toString().padStart(2, '0')}`;
}
