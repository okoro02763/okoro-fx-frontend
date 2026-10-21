import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AccountPage from './AccountPage';
import { ApiError } from '../api/client';
import {
  getAccountStatus,
  getMyWithdrawals,
  type AccountStatus,
} from '../api/account';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../api/account', () => ({
  getAccountStatus: jest.fn(),
  getMyWithdrawals: jest.fn(),
  setAccountType: jest.fn(),
  fundLiveAccount: jest.fn(),
  createWithdrawal: jest.fn(),
}));

const mockGetAccountStatus = getAccountStatus as jest.MockedFunction<
  typeof getAccountStatus
>;
const mockGetMyWithdrawals = getMyWithdrawals as jest.MockedFunction<
  typeof getMyWithdrawals
>;

const ACCOUNT: AccountStatus = {
  accountType: 'demo',
  availableBalance: 1250.75,
  liveVerified: false,
  kycPending: false,
  kycStatus: 'none',
  kyc: [],
  fees: {
    fundingPercent: 1.5,
    withdrawalPercent: 2,
    minWithdrawal: 5000,
  },
  account_type: 'demo',
  balance: 1250.75,
  currency: 'NGN',
  verification_status: 'none',
  can_trade_live: false,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    token: 'test-token',
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    isAdmin: false,
    logout: jest.fn(),
  });
  mockGetMyWithdrawals.mockResolvedValue([]);
  mockGetAccountStatus.mockResolvedValue(ACCOUNT);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

test('shows a loading skeleton instead of a bare "Loading..."', async () => {
  // A request that never settles is what used to leave the page on
  // "Loading..." forever.
  mockGetAccountStatus.mockReturnValue(new Promise(() => {}));

  renderPage();

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
});

test('tells the user the server is waking up when the request is slow', async () => {
  jest.useFakeTimers();
  mockGetAccountStatus.mockReturnValue(new Promise(() => {}));

  renderPage();

  expect(screen.queryByText(/waking up the server/i)).not.toBeInTheDocument();

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
});

test('shows an error card with a Retry button when the request fails', async () => {
  mockGetAccountStatus.mockRejectedValue(
    new ApiError('server exploded', 500)
  );

  renderPage();

  // A 500 is retried once automatically, so the card only appears after the
  // retry has run out.
  const alert = await screen.findByRole('alert', {}, { timeout: 6000 });
  expect(alert).toHaveTextContent(/couldn’t load your account/i);
  // Friendly text only: the raw error must not reach the user.
  expect(screen.queryByText(/server exploded/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});

test('the Retry button asks the API again', async () => {
  mockGetAccountStatus.mockRejectedValue(new ApiError('boom', 500));

  renderPage();

  const retry = await screen.findByRole(
    'button',
    { name: /retry/i },
    { timeout: 6000 }
  );
  const callsBefore = mockGetAccountStatus.mock.calls.length;

  mockGetAccountStatus.mockResolvedValue(ACCOUNT);
  await userEvent.click(retry);

  expect(await screen.findByText('DEMO')).toBeInTheDocument();
  expect(mockGetAccountStatus.mock.calls.length).toBeGreaterThan(callsBefore);
});

test('retries once automatically after a transport failure', async () => {
  mockGetAccountStatus
    .mockRejectedValueOnce(new ApiError('offline', 0, { offline: true }))
    .mockResolvedValueOnce(ACCOUNT);

  renderPage();

  await waitFor(() => expect(mockGetAccountStatus).toHaveBeenCalledTimes(2), {
    timeout: 5000,
  });
  expect(await screen.findByText('DEMO')).toBeInTheDocument();
});

test('does not retry a rejection the server will not change (401)', async () => {
  mockGetAccountStatus.mockRejectedValue(new ApiError('unauthorised', 401));

  renderPage();

  expect(
    await screen.findByText(/couldn’t load your account/i)
  ).toBeInTheDocument();
  expect(mockGetAccountStatus).toHaveBeenCalledTimes(1);
});
test('renders the account with a currency-formatted balance and a status badge', async () => {
  mockGetAccountStatus.mockResolvedValue({
    ...ACCOUNT,
    kycStatus: 'pending',
    verification_status: 'pending',
  });

  renderPage();

  expect(await screen.findByText('DEMO')).toBeInTheDocument();
  // NGN, because the wallet is denominated in naira.
  expect(screen.getByText(/NGN/)).toBeInTheDocument();
  expect(screen.getByText('Under review')).toBeInTheDocument();
});

test('renders the verification badge for every status', async () => {
  const cases: Array<[AccountStatus['kycStatus'], string]> = [
    ['none', 'Not verified'],
    ['pending', 'Under review'],
    ['verified', 'Verified'],
    ['rejected', 'Rejected'],
  ];

  for (const [status, label] of cases) {
    mockGetAccountStatus.mockResolvedValue({
      ...ACCOUNT,
      kycStatus: status,
      verification_status: status,
    });

    const { unmount } = renderPage();

    expect(await screen.findByText(label)).toBeInTheDocument();
    unmount();
  }
});
