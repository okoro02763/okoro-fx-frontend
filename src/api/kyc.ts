import { request } from './client';

// ---------------------------------------------------------------------------
// KYC (identity verification) API client.
//
// Mirrors the Django `kyc` app endpoints:
//   GET    /kyc/                -> current status + draft + documents
//   PUT    /kyc/details/        -> save step 1 (personal details) draft
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
        const msg =
          data && typeof (data as { message?: string }).message === 'string'
            ? (data as { message: string }).message
            : `Upload failed with status ${xhr.status}`;
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.send(form);
  });
}

export function deleteKycDocument(
  token: string,
  documentId: number
): Promise<KycStatusResponse> {
  return request<KycStatusResponse>(`/kyc/documents/${documentId}/`, {
    method: 'DELETE',
    token,
  });
}

export function submitKyc(token: string): Promise<KycStatusResponse> {
  return request<KycStatusResponse>('/kyc/submit/', { method: 'POST', token });
}
