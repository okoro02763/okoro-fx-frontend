import { reportApiFailure } from '../lib/errorReporter';

const API_BASE_URL =
  (process.env.REACT_APP_API_URL as string | undefined) ||
  'http://localhost:8000/api';

/**
 * Default request timeout.
 *
 * A request that never settles is the reason the My Account page used to sit
 * on "Loading..." forever: the server returned a 500 (or never answered at
 * all) and the promise simply never settled from the page's point of view.
 * Every request is therefore bounded, and the timeout is reported as a
 * distinct, retryable error instead of an indefinite spinner.
 */
export const DEFAULT_TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Milliseconds before the request is aborted. 0 disables the timeout. */
  timeoutMs?: number;
  /** Caller-owned abort signal (e.g. a component unmounting). */
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  /** True when the request was aborted by our own timeout. */
  timedOut: boolean;
  /** True when the request never reached the server (offline, DNS, CORS). */
  offline: boolean;
  /**
   * Machine-readable error code from the API, e.g. 'kyc_incomplete'.
   * The server sends this so the UI can react to a specific problem instead
   * of pattern-matching on the message text.
   */
  code: string | null;
  /**
   * Machine-readable list of missing fields, when the API reports one.
   * Empty for every other error.
   */
  missing: string[];

  constructor(
    message: string,
    status: number,
    opts: {
      timedOut?: boolean;
      offline?: boolean;
      code?: string | null;
      missing?: string[];
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.timedOut = opts.timedOut ?? false;
    this.offline = opts.offline ?? false;
    this.code = opts.code ?? null;
    this.missing = opts.missing ?? [];
  }
}

/**
 * True for failures that a second attempt could plausibly fix.
 *
 * A 4xx (unauthenticated, forbidden, bad request) is a permanent answer, so
 * retrying it only delays the error the user needs to see. Timeouts and
 * transport failures are the opposite: the server may be waking up, or the
 * network blipped.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.timedOut || err.offline || err.status === 0 || err.status >= 500;
  }
  return true;
}

/**
 * A short, human-readable description of a failure.
 *
 * Never leaks a raw exception message, a stack trace or a URL to the UI --
 * those go to the console for the developer.
 */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.timedOut) {
      return 'The server took too long to respond.';
    }
    if (err.offline) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Your session has expired. Please sign in again.';
    }
    if (err.status >= 500) {
      return 'The server ran into a problem. Please try again in a moment.';
    }
    return err.message || 'Something went wrong. Please try again.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;
  // Used only for the error report: how long the failed call took.
  const startedAt = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // One controller backs both the timeout and the caller's abort signal, so
  // the request can be cancelled from either side.
  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', forwardAbort);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (timedOut) {
      // A timeout is a 5xx-class failure from the user's point of view: the
      // page never got an answer. Report it, then surface a retryable error.
      reportApiFailure({ method, path, status: 0, durationMs });
      throw new ApiError('The server took too long to respond.', 0, {
        timedOut: true,
      });
    }
    if (signal?.aborted) {
      // The caller cancelled on purpose (e.g. unmount): not a failure to
      // show, so it is re-thrown untouched.
      throw err;
    }
    reportApiFailure({ method, path, status: 0, durationMs });
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      { offline: true }
    );
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', forwardAbort);
  }

  if (!response.ok) {
    // 5xx means the backend broke. Report endpoint/status/duration only --
    // never the request body, query string or credentials. A 4xx is normal
    // application flow and is intentionally not reported.
    if (response.status >= 500) {
      reportApiFailure({
        method,
        path,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
    }
    let message = `Request failed with status ${response.status}`;
    let code: string | null = null;
    let missing: string[] = [];
    try {
      const data = await response.json();
      if (data && typeof data === 'object') {
        const body = data as {
          detail?: unknown;
          message?: unknown;
          code?: unknown;
          missing?: unknown;
        };
        // The API uses "detail" everywhere now; "message" is still read
        // because older deployments (and some other endpoints) answer with
        // it, and a blank error message is worse than a legacy key.
        const detail =
          typeof body.detail === 'string' ? body.detail : null;
        const legacy =
          typeof body.message === 'string' ? body.message : null;
        if (detail || legacy) {
          message = detail || legacy || message;
        }
        if (typeof body.code === 'string') {
          code = body.code;
        }
        if (Array.isArray(body.missing)) {
          missing = body.missing.filter(
            (item): item is string => typeof item === 'string'
          );
        }
      }
    } catch {
      // ignore non-JSON error body
    }
    throw new ApiError(message, response.status, { code, missing });
  }

  // 204 or empty response
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      'The server returned a response the page could not read.',
      response.status
    );
  }
}
