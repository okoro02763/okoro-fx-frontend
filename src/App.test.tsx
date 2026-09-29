import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  // jsdom has no matchMedia; recharts and AuthContext both reach for it.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
  // Every page fetches on mount; keep the tests off the network.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  }) as jest.Mock;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('unauthenticated visitors are redirected to the login page', async () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
