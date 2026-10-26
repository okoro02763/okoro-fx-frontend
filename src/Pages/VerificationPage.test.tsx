import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// This wizard is form-heavy and these tests type into many fields. The
// default 5 s Jest timeout is too tight on slow CI/Windows runners.
jest.setTimeout(30_000);

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

/** Everything except the document number: details, front, back and selfie. */
const COMPLETE_NO_NUMBER: KycStatusResponse = {
  status: 'none',
  rejectionReason: null,
  submittedAt: null,
  reviewedAt: null,
  details: {
    fullName: 'Jane Doe',
    dateOfBirth: '1990-01-01',
    country: 'Nigeria',
    phone: '+234 801 234 5678',
    addressLine: '14 Admiralty Way',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '106104',
  },
  docType: 'national_id',
  docNumberMasked: null,
  hasDocumentNumber: false,
  documentNumberLast4: '',
  documents: [
    { id: 8, kind: 'id_front', docType: 'national_id', uploadedAt: '2026-01-01T00:00:00Z' },
    { id: 9, kind: 'id_back', docType: 'national_id', uploadedAt: '2026-01-01T00:00:00Z' },
    { id: 10, kind: 'selfie', docType: 'national_id', uploadedAt: '2026-01-01T00:00:00Z' },
  ],
};

/** Complete details, but no front/back file yet (so the pickers are shown). */
const COMPLETE_NO_FRONT: KycStatusResponse = {
  ...COMPLETE_NO_NUMBER,
  documents: COMPLETE_NO_NUMBER.documents.filter((d) => d.kind === 'selfie'),
};

/** Everything the server needs except the front image. */
const COMPLETE_NO_FRONT_WITH_NUMBER: KycStatusResponse = {
  ...COMPLETE_NO_FRONT,
  docNumberMasked: '•••• 4567',
  hasDocumentNumber: true,
  documentNumberLast4: '4567',
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
    expect(await screen.findByRole('alert')).toHaveTextContent(/document number/i);
    expect(mockSaveKycDocument).toHaveBeenCalledTimes(1);
  });

  test('the review screen trusts the server and blocks submit when the number is missing', async () => {
    mockGetKyc.mockResolvedValue(COMPLETE_NO_NUMBER);
    mockSaveKycDetails.mockResolvedValue(COMPLETE_NO_NUMBER);
    mockSaveKycDocument.mockResolvedValue(COMPLETE_NO_NUMBER);

    renderPage();
    await screen.findByLabelText('Full legal name');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText('Document type');

    // The number reaches the server *as typed here*; the mock still returns a
    // profile without one, which is exactly the buggy server state to guard.
    await userEvent.type(
      screen.getByLabelText('Document number (as printed)'),
      '89234567890'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Step 3 must accept the selfie the server already holds.
    await screen.findByText('Selfie with document');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Review & submit' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/document number/i);
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
    // Only the identity-document section is incomplete.
    expect(screen.getAllByText(/still incomplete/i)).toHaveLength(1);
  });

  test('fixing a missing front image jumps to the identity step, not the selfie step', async () => {
    mockGetKyc.mockResolvedValue(COMPLETE_NO_FRONT_WITH_NUMBER);
    mockSaveKycDetails.mockResolvedValue(COMPLETE_NO_FRONT_WITH_NUMBER);
    mockSaveKycDocument.mockResolvedValue(COMPLETE_NO_FRONT_WITH_NUMBER);

    renderPage();
    await screen.findByLabelText('Full legal name');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText('Document type');

    // The server already has the number, so step 2 continues without retyping.
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Selfie with document');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Review & submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();

    const item = screen.getByText('Front of your document').closest('li');
    expect(item).not.toBeNull();
    await userEvent.click(within(item as HTMLElement).getByRole('button', { name: 'Fix' }));

    // The front picker is on step 2; landing on the selfie step would make it
    // impossible to fix the missing file.
    expect(await screen.findByLabelText('Document type')).toBeInTheDocument();
    expect(screen.getByText('Front of document')).toBeInTheDocument();
  });

  test('clicking remove twice sends exactly one DELETE', async () => {
    mockGetKyc.mockResolvedValue(COMPLETE_NO_NUMBER);
    mockSaveKycDetails.mockResolvedValue(COMPLETE_NO_NUMBER);
    mockDeleteKycDocument.mockResolvedValue(COMPLETE_NO_NUMBER);

    renderPage();
    await screen.findByLabelText('Full legal name');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText('Document type');

    const remove = screen.getByRole('button', { name: 'Remove Front of document' });
    // Two clicks before the first request settles: the ref guard must absorb
    // the second one (the old code sent DELETE twice: 200 then 404).
    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mockDeleteKycDocument).toHaveBeenCalledTimes(1));
    expect(mockDeleteKycDocument).toHaveBeenCalledWith('test-token', 8);
  });

  test('uploading a document also sends the number for a non-NIN/BVN type', async () => {
    mockGetKyc.mockResolvedValue(COMPLETE_NO_FRONT);
    mockSaveKycDetails.mockResolvedValue(COMPLETE_NO_FRONT);
    mockUploadKycDocument.mockResolvedValue(COMPLETE_NO_NUMBER);

    const { container } = renderPage();
    await screen.findByLabelText('Full legal name');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText('Document type');

    await userEvent.type(
      screen.getByLabelText('Document number (as printed)'),
      '89234567890'
    );

    // Front-image picker (the first file input on the identity step).
    const file = new File(['png'], 'front.png', { type: 'image/png' });
    fireEvent.change(container.querySelectorAll('input[type="file"]')[0], {
      target: { files: [file] },
    });

    await waitFor(() => expect(mockUploadKycDocument).toHaveBeenCalledTimes(1));
    expect(mockUploadKycDocument).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        kind: 'id_front',
        docType: 'national_id',
        docNumber: '89234567890',
        file,
      }),
      expect.any(Function)
    );
  });
});
