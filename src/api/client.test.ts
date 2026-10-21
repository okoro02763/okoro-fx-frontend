import { ApiError, describeError, isRetryableError, request } from './client';

const mockFetch = () => {
  global.fetch = jest.fn() as jest.Mock;
  return global.fetch as jest.Mock;
};

afterEach(() => {
  jest.clearAllMocks();
});

test('a request that never answers is aborted and reported as a timeout', async () => {
  const fetchMock = mockFetch();
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      })
  );

  const error = (await request('/account/', { timeoutMs: 20 }).catch(
    (e) => e
  )) as ApiError;

  expect(error).toBeInstanceOf(ApiError);
  expect(error.timedOut).toBe(true);
  expect(error.status).toBe(0);
  expect(isRetryableError(error)).toBe(true);
  expect(describeError(error)).toMatch(/too long/i);
});

test('a transport failure is reported as an offline error, not a crash', async () => {
  const fetchMock = mockFetch();
  fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

  const error = (await request('/account/').catch((e) => e)) as ApiError;

  expect(error).toBeInstanceOf(ApiError);
  expect(error.offline).toBe(true);
  expect(isRetryableError(error)).toBe(true);
});

test('a 500 is retryable and a 401 is not', async () => {
  const fetchMock = mockFetch();
  fetchMock.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ message: 'server exploded' }),
  });
  const serverError = (await request('/account/').catch((e) => e)) as ApiError;
  expect(serverError.status).toBe(500);
  expect(isRetryableError(serverError)).toBe(true);

  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ message: 'unauthorised' }),
  });
  const authError = (await request('/account/').catch((e) => e)) as ApiError;
  expect(authError.status).toBe(401);
  expect(isRetryableError(authError)).toBe(false);
});

test('a successful response is parsed', async () => {
  const fetchMock = mockFetch();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accountType: 'demo' }),
  });

  await expect(request('/account/')).resolves.toEqual({ accountType: 'demo' });
});

test('the bearer token is sent when one is supplied', async () => {
  const fetchMock = mockFetch();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  });

  await request('/account/', { token: 'abc123' });

  const [, init] = fetchMock.mock.calls[0];
  expect(init.headers.Authorization).toBe('Bearer abc123');
});
