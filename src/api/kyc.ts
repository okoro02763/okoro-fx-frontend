import { ApiError, request } from './client';

// ---------------------------------------------------------------------------
// KYC (identity verification) API client.
//
// Mirrors the Django `kyc` app endpoints:
//   GET    /kyc/                -> current status + draft + documents
//   PUT    /kyc/details/        -> save the draft (personal details and/or
//                                  the document type + number; partial update)
//   POST   /kyc/documents/      -> upload one document (multipart)
//   DELETE /kyc/documents/<id>/ -> remove an uploaded document
//   POST   /kyc/submit/         -> submit everything for review
// ---------------------------------------------------------------------------

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type KycDocKind = 'id_front' | 'id_back' | 'selfie';

export interface KycDocument {
  id: number;
  kind: KycDocKind;
  docType: string;
  uploadedAt: string;
  /** Object URL for a local preview; only set client-side after upload. */
  previewUrl?: string;
}

export interface KycDetails {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  country: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface KycStatusResponse {
  status: KycStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  details: KycDetails;
  docType: string | null;
  docNumberMasked: string | null;
  /**
   * Whether the server holds a document number, and its last four digits.
   *
   * The review screen renders from these instead of from browser state, so it
   * can never show a number the server never received.
   */
  hasDocumentNumber: boolean;
  documentNumberLast4: string;
  /**
   * Canonical snake_case aliases of the two fields above, returned by the same
   * endpoint so clients can read whichever shape they prefer.
   */
  has_document_number?: boolean;
  document_number_last4?: string;
  doc_type?: string | null;
  /** Which upload slots the server actually holds (set on every response). */
  has_id_front?: boolean;
  has_id_back?: boolean;
  has_selfie?: boolean;
  documents: KycDocument[];
}

const EMPTY_DETAILS: KycDetails = {
  fullName: '',
  dateOfBirth: '',
  country: 'Nigeria',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
};

export function emptyKycDetails(): KycDetails {
  return { ...EMPTY_DETAILS };
}

export function getKyc(token: string): Promise<KycStatusResponse> {
  return request<KycStatusResponse>('/kyc/', { token });
}

export function saveKycDetails(
  token: string,
  details: KycDetails
): Promise<KycStatusResponse> {
  return request<KycStatusResponse>('/kyc/details/', {
    method: 'PUT',
    token,
    body: details,
  });
}

/**
 * Save the document type and number (step 2 of the wizard).
 *
 * The endpoint is a partial update: only the fields sent here are written,
 * so saving the document never disturbs the personal details from step 1.
 */
export function saveKycDocument(
  token: string,
  payload: { docType: string; docNumber?: string }
): Promise<KycStatusResponse> {
  return request<KycStatusResponse>('/kyc/details/', {
    method: 'PUT',
    token,
    body: payload,
  });
}

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0..1; falls back to indeterminate (0) when the total is unknown. */
  fraction: number;
}

/**
 * Upload one KYC document. Uses XHR because fetch() cannot report upload
 * progress, and the wizard shows a progress bar for large images.
 */
export function uploadKycDocument(
  token: string,
  params: { kind: KycDocKind; docType: string; docNumber?: string; file: File },
  onProgress?: (p: UploadProgress) => void
): Promise<KycStatusResponse> {
  const form = new FormData();
  form.append('kind', params.kind);
  form.append('doc_type', params.docType);
  if (params.docNumber) form.append('doc_number', params.docNumber);
  form.append('file', params.file);

  const base =
    (process.env.REACT_APP_API_URL as string | undefined) ||
    'http://localhost:8000/api';

  return new Promise<KycStatusResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/kyc/documents/`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          fraction: e.total ? e.loaded / e.total : 0,
        });
      }
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON body
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as KycStatusResponse);
      } else {
        // Read the same error body shape as `request()`: "detail" first,
        // then the legacy "message", plus the machine-readable code.
        const body = (data ?? {}) as {
          detail?: unknown;
          message?: unknown;
          code?: unknown;
        };
        const detail = typeof body.detail === 'string' ? body.detail : null;
        const legacy = typeof body.message === 'string' ? body.message : null;
        const code = typeof body.code === 'string' ? body.code : null;
        reject(
          new ApiError(
            detail || legacy || `Upload failed with status ${xhr.status}`,
            xhr.status,
            { code }
          )
        );
      }
    };
    xhr.onerror = () =>
      reject(new ApiError('Upload failed. Check your connection.', 0, {
        offline: true,
      }));
    xhr.send(form);
  });
}

export async function deleteKycDocument(
  token: string,
  documentId: number
): Promise<KycStatusResponse> {
  try {
    return await request<KycStatusResponse>(`/kyc/documents/${documentId}/`, {
      method: 'DELETE',
      token,
    });
  } catch (err) {
    // A delete is idempotent from the user's point of view. If the document is
    // already gone (a retry, a double click, another tab), report success and
    // re-read the profile instead of showing "not found".
    if (err instanceof ApiError && err.status === 404) {
      return getKyc(token);
    }
    throw err;
  }
}

export function submitKyc(token: string): Promise<KycStatusResponse> {
  return request<KycStatusResponse>('/kyc/submit/', { method: 'POST', token });
}
