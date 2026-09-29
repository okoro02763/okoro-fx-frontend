const API_BASE_URL =
  (process.env.REACT_APP_API_URL as string | undefined) ||
  'http://localhost:8000/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      // ignore non-JSON error body
    }
    throw new ApiError(message, response.status);
  }

  // 204 or empty response
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
