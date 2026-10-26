import { deleteKycDocument } from './kyc';

afterEach(() => {
  jest.clearAllMocks();
});

test('deleting an already-deleted document is treated as success', async () => {
  const fetchMock = jest
    .fn()
    // The document was already removed by the first request (or another tab).
    .mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found.', code: 'not_found' }),
    })
    // ...so the client re-reads the profile instead of showing an error.
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'none', documents: [] }),
    });
  global.fetch = fetchMock as unknown as typeof fetch;

  await expect(deleteKycDocument('test-token', 8)).resolves.toMatchObject({
    status: 'none',
    documents: [],
  });

  expect(fetchMock.mock.calls[0][0]).toContain('/kyc/documents/8/');
  expect(fetchMock.mock.calls[1][0]).toContain('/kyc/');
});
