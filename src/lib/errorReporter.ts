/**
 * Client-side error reporting.
 *
 * Sends a small, scrubbed payload to POST /api/monitoring/client-error/, which
 * forwards it to Discord. Three rules matter here:
 *
 * 1. Reporting must never break the app or the request it is reporting on.
 *    Everything is fire-and-forget and all failures are swallowed.
 * 2. No personal data leaves the browser. The payload is scrubbed before it is
 *    sent, and the backend scrubs it again.
 * 3. No loops. Failures of the reporter itself are ignored, and duplicate
 *    reports are rate limited locally so a render loop cannot flood the API.
 */

const API_BASE_URL =
  (process.env.REACT_APP_API_URL as string | undefined) ||
  'http://localhost:8000/api';

const REPORT_PATH = '/monitoring/client-error/';
const APP_VERSION = (process.env.REACT_APP_VERSION as string | undefined) || 'unknown';

const MAX_LOCAL_REPORTS_PER_MINUTE = 5;
const DEDUPE_WINDOW_MS = 60_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LINES = 10;

export interface ClientErrorReport {
  message: string;
  stack?: string;
  route?: string;
  userAgent?: string;
  appVersion?: string;
  /** Optional stable key for local dedupe (e.g. endpoint + status). */
  dedupeKey?: string;
}

let installed = false;
let windowStartedAt = 0;
let reportsInWindow = 0;
const recentReports = new Map<string, number>();

function reportingEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.REACT_APP_ERROR_REPORTING !== 'true'
  ) {
    // Keep the test suite off the network and independent of report calls.
    return false;
  }
  return (process.env.REACT_APP_ERROR_REPORTING || 'true').toLowerCase() !== 'false';
}

/**
 * Redact secrets and personal data before it leaves the browser.
 *
 * Mirrors backend/monitoring/scrubbing.py closely enough that a document
 * number cannot slip through in a browser-only stack trace.
 */
export function scrubText(input: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  let text = input === null || input === undefined ? '' : String(input);

  text = text.replace(
    /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\S+/gi,
    '[REDACTED_WEBHOOK]'
  );
  text = text.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  text = text.replace(
    /\b(pass(?:word|wd|phrase)?|token|secret|authorization|cookie|nin|bvn|phone(?:\s*number)?|email(?:\s*address)?|document(?:\s*(?:number|no\.?|id))?)\b\s*[:=#]?\s*([^\s,;]+)/gi,
    '$1 [REDACTED]'
  );
  text = text.replace(
    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );
  text = text.replace(
    /(^|[^\d])((?:\+?234|0)[789]\d{9})(?!\d)/g,
    '$1[REDACTED_PHONE]'
  );
  text = text.replace(/(^|\D)(\d{11,})(?!\d)/g, '$1[REDACTED_NUMBER]');
  text = text.replace(
    /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+/g,
    '[REDACTED_KEY]'
  );
  text = text.replace(/\b[A-Za-z0-9_\-]{24,}\b/g, '[REDACTED_KEY]');

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}\u2026` : text;
}

/**
 * Strip secrets out of a URL path. This app has token routes such as
 * /reset-password/<token>; the token is in the path, not the query string.
 */
function sanitiseRoute(path: string): string {
  const secretParent = /^(reset-password|verify|invite|confirm|auth|link)$/i;
  let redactNext = false;
  return (path || '/')
    .split('/')
    .map((part) => {
      if (!part) {
        return part;
      }
      if (redactNext) {
        redactNext = false;
        return '[REDACTED]';
      }
      if (secretParent.test(part)) {
        redactNext = true;
        return part;
      }
      if (/^[A-Za-z0-9_\-]{24,}$/.test(part)) {
        return '[REDACTED]';
      }
      return part;
    })
    .join('/');
}

function currentRoute(): string {
  try {
    return sanitiseRoute(window.location.pathname || '/');
  } catch {
    return '';
  }
}

function currentUserAgent(): string {
  try {
    return scrubText(navigator.userAgent || '', 300);
  } catch {
    return '';
  }
}

function trimStack(stack: string | undefined): string {
  if (!stack) {
    return '';
  }
  return scrubText(
    stack
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_STACK_LINES)
      .join('\n'),
    4_000
  );
}

function pruneDedupe(now: number): void {
  if (recentReports.size < 100) {
    return;
  }
  recentReports.forEach((sentAt, key) => {
    if (now - sentAt > DEDUPE_WINDOW_MS) {
      recentReports.delete(key);
    }
  });
}

/**
 * Report one client-side failure. Never throws and never returns a promise
 * that the caller has to await.
 */
export function reportClientError(report: ClientErrorReport): void {
  if (!reportingEnabled()) {
    return;
  }

  const message = scrubText(report.message, MAX_MESSAGE_LENGTH).trim();
  if (!message) {
    return;
  }

  const route = sanitiseRoute(report.route || currentRoute());
  const now = Date.now();

  // Deduplicate locally: a render loop or a failing poll must not hammer the
  // public intake endpoint (and the backend dedupes again anyway).
  const key = `${route}|${report.dedupeKey || message.slice(0, 160)}`;
  const lastSent = recentReports.get(key);
  if (lastSent !== undefined && now - lastSent < DEDUPE_WINDOW_MS) {
    return;
  }

  if (now - windowStartedAt >= 60_000) {
    windowStartedAt = now;
    reportsInWindow = 0;
  }
  if (reportsInWindow >= MAX_LOCAL_REPORTS_PER_MINUTE) {
    return;
  }

  reportsInWindow += 1;
  recentReports.set(key, now);
  pruneDedupe(now);

  const body = {
    message,
    stack: trimStack(report.stack),
    route: scrubText(route, 300),
    userAgent: report.userAgent ? scrubText(report.userAgent, 300) : currentUserAgent(),
    appVersion: report.appVersion || APP_VERSION,
  };

  try {
    // Direct fetch, not api/client.ts: importing the API client here would
    // create a cycle, and a report must not itself be retried or reported.
    void fetch(`${API_BASE_URL}${REPORT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // The reporter is the last line of defence; it never reports itself.
    });
  } catch {
    // Synchronous fetch failure (e.g. a privacy browser): stay silent.
  }
}

/**
 * Report a failed API call. Only server errors (5xx) and network/timeout
 * failures are interesting; 400/401/403/404 are normal application flow.
 */
export function reportApiFailure(args: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}): void {
  const { method, path, status, durationMs } = args;
  if (!path || path.includes('/monitoring/')) {
    return; // Never report the reporter itself.
  }
  if (!(status >= 500 || status === 0)) {
    return;
  }

  const endpoint = path.split('?')[0];
  const outcome = status === 0 ? 'network error' : `HTTP ${status}`;
  reportClientError({
    message: `API request failed: ${method} ${endpoint} -> ${outcome} (${Math.round(
      durationMs
    )}ms)`,
    route: currentRoute(),
    appVersion: APP_VERSION,
    dedupeKey: `${method} ${endpoint} ${status}`,
  });
}

/**
 * Install window.onerror / unhandledrejection handlers. Safe to call more than
 * once; only the first call binds.
 */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error as Error | undefined;
    reportClientError({
      message: error?.message || event.message || 'Unknown browser error',
      stack:
        error?.stack ||
        (event.filename
          ? `at ${event.filename}:${event.lineno}:${event.colno}`
          : ''),
      route: currentRoute(),
      userAgent: currentUserAgent(),
      appVersion: APP_VERSION,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const isError = reason instanceof Error;
    let message = 'Unhandled promise rejection';
    if (isError) {
      message = reason.message || message;
    } else if (typeof reason === 'string' && reason) {
      message = reason;
    } else if (reason !== undefined && reason !== null) {
      try {
        message = `Unhandled promise rejection: ${String(reason)}`;
      } catch {
        // Keep the generic message.
      }
    }
    reportClientError({
      message,
      stack: isError ? reason.stack : '',
      route: currentRoute(),
      userAgent: currentUserAgent(),
      appVersion: APP_VERSION,
    });
  });
}
