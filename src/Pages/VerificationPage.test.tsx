import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import VerificationPage from './VerificationPage';
import { ApiError } from '../api/client';
import {
  deleteKycDocument,
  emptyKycDetails,
  getKyc,
  saveKycDetails,
  saveKycDocument,
  submitKyc,
  uploadKycDocument,
  type KycStatusResponse,
} from '../api/kyc';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../api/kyc', () => ({
  getKyc: jest.fn(),
  saveKycDetails: jest.fn(),
  saveKycDocument: jest.fn(),
  submitKyc: jest.fn(),
  uploadKycDocument: jest.fn(),
  deleteKycDocument: jest.fn(),
  emptyKycDetails: () => ({
    fullName: '',
    dateOfBirth: '',
    country: 'Nigeria',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
  }),
}));

const mockGetKyc = getKyc as jest.MockedFunction<typeof getKyc>;
const mockSaveKycDetails = saveKycDetails as jest.MockedFunction<typeof saveKycDetails>;
const mockSaveKycDocument = saveKycDocument as jest.MockedFunction<typeof saveKycDocument>;
const mockSubmitKyc = submitKyc as jest.MockedFunction<typeof submitKyc>;
const mockUploadKycDocument = uploadKycDocument as jest.MockedFunction<typeof uploadKycDocument>;
const mockDeleteKycDocument = deleteKycDocument as jest.MockedFunction<typeof deleteKycDocument>;

const STATUS_NONE: KycStatusResponse = {
  status: 'none',
  rejectionReason: null,
  submittedAt: null,
  reviewedAt: null,
  details: emptyKycDetails(),
  docType: null,
  docNumberMasked: null,
  hasDocumentNumber: false,
  documentNumberLast4: '',
  documents: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <VerificationPage />
    </MemoryRouter>
  );
}

/** Walk the wizard up to the identity-document step (step 2). */
async function reachIdentityStep() {
  const fullName = await screen.findByLabelText('Full legal name');
  await userEvent.type(fullName, 'Jane Doe');
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
  await userEvent.type(screen.getByLabelText('Phone number'), '+234 801 234 5678');
  await userEvent.type(screen.getByLabelText('Residential address (street)'), '14 Admiralty Way');
  await userEvent.type(screen.getByLabelText('City'), 'Lagos');
  await userEvent.type(screen.getByLabelText('State / province'), 'Lagos');
  await userEvent.type(screen.getByLabelText('Postal code'), '106104');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('Document type');
}

describe('VerificationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line no-console
    console.log('DEBUG emptyKycDetails ->', typeof emptyKycDetails, JSON.stringify(emptyKycDetails()));
    mockUseAuth.mockReturnValue({
      token: 'test-token',
      user: { name: 'Jane Doe', email: 'jane@example.com', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockGetKyc.mockResolvedValue(STATUS_NONE);
    mockSaveKycDetails.mockResolvedValue(STATUS_NONE);
    mockSaveKycDocument.mockResolvedValue(STATUS_NONE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('editing the document number and pressing Continue sends exactly one save with the number', async () => {
    renderPage();
    await reachIdentityStep();

    const docNumber = screen.getByLabelText('Document number (as printed)');
    // The user edits the number (it used to live only in browser state).
    await userEvent.type(docNumber, '89234567890');
    await userEvent.clear(docNumber);
    await userEvent.type(docNumber, '89541234567');

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(mockSaveKycDocument).toHaveBeenCalledTimes(1)
    );
    expect(mockSaveKycDocument).toHaveBeenCalledWith('test-token', {
      docType: 'national_id',
      docNumber: '89541234567',
    });
  });

  test('stays on the identity step and shows the server error when the save fails', async () => {
    mockSaveKycDocument.mockRejectedValue(
      new ApiError('Please enter your document number first.', 400, {
        code: 'kyc_incomplete',
        missing: ['document_number'],
      })
    );

    renderPage();
    await reachIdentityStep();

    const docNumber = screen.getByLabelText('Document number (as printed)');
    await userEvent.type(docNumber, '89234567890');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // The wizard must not advance when the server rejects the save.
    expect(await screen.findByLabelText('Document type')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/document number/i);
    expect(mockSaveKycDocument).toHaveBeenCalledTimes(1);
  });
});
