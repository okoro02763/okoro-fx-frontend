import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, FileText, Image, X } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Field, { inputStyle } from '../components/Field';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ApiError, describeError, request } from '../api/client';
import type { AccountStatus } from '../api/account';
import {
  deleteKycDocument,
  emptyKycDetails,
  getKyc,
  saveKycDetails,
  saveKycDocument,
  submitKyc,
  uploadKycDocument,
  type KycDetails,
  type KycDocKind,
  type KycDocument,
  type KycStatusResponse,
} from '../api/kyc';

const TOTAL_STEPS = 4;

const DOC_TYPES_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  Nigeria: [
    { value: 'national_id', label: 'National ID card (NIN slip)' },
    { value: 'passport', label: 'International passport' },
    { value: 'drivers_license', label: "Driver's licence" },
    { value: 'voters_card', label: "Voter's card" },
    { value: 'nin', label: 'NIN (number only)' },
    { value: 'bvn', label: 'BVN (number only, masked)' },
  ],
};

const DEFAULT_DOC_TYPES = [
  { value: 'national_id', label: 'National ID card' },
  { value: 'passport', label: 'International passport' },
  { value: 'drivers_license', label: "Driver's licence" },
  { value: 'voters_card', label: "Voter's card" },
];

// Doc types entered as a number only -- no image upload required.
const NUMBER_ONLY_TYPES = new Set(['nin', 'bvn']);
// Doc types that have a reverse side worth photographing.
const HAS_BACK_TYPES = new Set(['national_id', 'drivers_license', 'voters_card']);

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

type Step = 1 | 2 | 3 | 4;
type Phase = 'wizard' | 'status';

interface FieldErrors {
  [key: string]: string;
}

function isAdult(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 18;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Human labels for the missing items the API reports on a failed submit.
 * The keys are the ones `kyc/views.py::_missing_items` returns.
 */
const MISSING_LABELS: Record<string, string> = {
  full_name: 'Full legal name',
  date_of_birth: 'Date of birth',
  country: 'Country',
  phone: 'Phone number',
  address_line: 'Residential address',
  city: 'City',
  state: 'State / province',
  postal_code: 'Postal code',
  document_type: 'Document type',
  document_number: 'Document number',
  id_front: 'Front of your document',
  id_back: 'Back of your document',
  selfie: 'Selfie holding your document',
};

/** Which step of the wizard fixes a given missing item. */
function stepForMissing(key: string): Step {
  if (key === 'document_type' || key === 'document_number') return 2;
  if (key === 'id_front' || key === 'id_back' || key === 'selfie') return 3;
  return 1;
}

/** Label for a document type value, whichever country list it came from. */
function docTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  const all = [
    ...Object.values(DOC_TYPES_BY_COUNTRY).flat(),
    ...DEFAULT_DOC_TYPES,
  ];
  return all.find((d) => d.value === value)?.label || value;
}

export default function VerificationPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('wizard');
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Items the server reported as missing when a submission was rejected.
   * Rendered as a list with a button that jumps to the step that fixes them.
   */
  const [missing, setMissing] = useState<string[]>([]);

  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [details, setDetails] = useState<KycDetails>(emptyKycDetails);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [docType, setDocType] = useState('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadKind, setUploadKind] = useState<KycDocKind | null>(null);
  const [consent, setConsent] = useState(false);

  const docTypes = useMemo(
    () => DOC_TYPES_BY_COUNTRY[details.country] || DEFAULT_DOC_TYPES,
    [details.country]
  );
  const numberOnly = NUMBER_ONLY_TYPES.has(docType);
  const needsBack = HAS_BACK_TYPES.has(docType);

  // Load the existing draft so a refresh never loses progress.
  useEffect(() => {
    if (!token) return;
    getKyc(token)
      .then((res) => {
        setKyc(res);
        setDetails({ ...emptyKycDetails(), ...res.details });
        // The document type lives on the server; the local default is only a
        // placeholder for a profile that has never been touched.
        if (res.docType) setDocType(res.docType);
        if (res.status === 'pending' || res.status === 'verified' || res.status === 'rejected') {
          setPhase('status');
        }
      })
      .catch((err) => {
        setError(describeError(err));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setDetail = (key: keyof KycDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep1 = (): boolean => {
    const e: FieldErrors = {};
    if (!details.fullName.trim() || details.fullName.trim().split(/\s+/).length < 2) {
      e.fullName = 'Enter your full legal name (first and last).';
    }
    if (!details.dateOfBirth) {
      e.dateOfBirth = 'Date of birth is required.';
    } else if (!isAdult(details.dateOfBirth)) {
      e.dateOfBirth = 'You must be at least 18 years old.';
    }
    if (!details.country.trim()) e.country = 'Country is required.';
    if (!details.phone.trim() || details.phone.replace(/\D/g, '').length < 7) {
      e.phone = 'Enter a valid phone number.';
    }
    if (!details.addressLine.trim()) e.addressLine = 'Street address is required.';
    if (!details.city.trim()) e.city = 'City is required.';
    if (!details.state.trim()) e.state = 'State / province is required.';
    if (!details.postalCode.trim()) e.postalCode = 'Postal code is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /**
   * Re-read the profile from the server.
   *
   * Every save is followed by this so the wizard always renders what the
   * server actually holds. The previous version kept everything in browser
   * state, which is how a document number could look filled in on the review
   * screen while the server had never received it.
   */
  const refreshKyc = useCallback(async (): Promise<KycStatusResponse | null> => {
    if (!token) return null;
    try {
      const res = await getKyc(token);
      setKyc(res);
      return res;
    } catch (err) {
      setError(describeError(err));
      return null;
    }
  }, [token]);

  const persistDetails = async (): Promise<boolean> => {
    if (!token) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await saveKycDetails(token, details);
      setKyc(res);
      await refreshKyc();
      return true;
    } catch (err) {
      setError(describeError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save the document type and number (step 2).
   *
   * This is the call the wizard used to skip: "Continue" only moved to the
   * next screen, so the number never reached the server and the submission
   * was rejected with "Please enter your document number first."
   *
   * The number is only sent when the field is filled in. A profile that
   * already holds a number keeps it when the field is left blank -- the
   * server never lets an empty value overwrite a stored one.
   */
  const persistDocument = async (): Promise<boolean> => {
    if (!token) return false;
    setSaving(true);
    setError(null);
    try {
      const number = docNumber.trim();
      await saveKycDocument(
        token,
        number ? { docType, docNumber: number } : { docType }
      );
      await refreshKyc();
      return true;
    } catch (err) {
      setError(describeError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      const ok = await persistDetails();
      if (!ok) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      const e: FieldErrors = {};
      if (!docType) e.docType = 'Choose a document type.';
      // A number is only required when the server does not have one yet.
      if (!kyc?.hasDocumentNumber && !docNumber.trim()) {
        e.docNumber = numberOnly
          ? 'This number is required.'
          : 'Document number is required.';
      }
      setErrors(e);
      if (Object.keys(e).length > 0) return;
      // Save before moving on. If the server rejects it, stay on this step
      // and show why -- the number has to reach the server for the review
      // screen and the submission to mean anything.
      const ok = await persistDocument();
      if (!ok) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!selfieFile) {
        setErrors({ selfie: 'A selfie holding your document is required.' });
        return;
      }
      setErrors({});
      setStep(4);
    }
  };

  const uploadFile = async (kind: KycDocKind, file: File) => {
    if (!token) return;
    // Client-side guard before spending bandwidth.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG or PDF files are accepted.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is too large (${fmtBytes(file.size)}). Maximum is 5 MB.`);
      return;
    }
    setError(null);
    setUploadKind(kind);
    setUploadPct(0);
    try {
      const res = await uploadKycDocument(
        token,
        { kind, docType, docNumber: numberOnly ? docNumber : undefined, file },
        (p) => setUploadPct(Math.round(p.fraction * 100))
      );
      setKyc(res);
      if (kind === 'id_front') setFrontFile(file);
      if (kind === 'id_back') setBackFile(file);
      if (kind === 'selfie') setSelfieFile(file);
      setErrors((e) => ({ ...e, [kind]: '' }));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setUploadKind(null);
      setUploadPct(null);
    }
  };

  const removeDocument = async (kind: KycDocKind) => {
    if (!token || !kyc) return;
    const doc = kyc.documents.find((d) => d.kind === kind);
    try {
      if (doc) {
        const res = await deleteKycDocument(token, doc.id);
        setKyc(res);
      }
      if (kind === 'id_front') setFrontFile(null);
      if (kind === 'id_back') setBackFile(null);
      if (kind === 'selfie') setSelfieFile(null);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleSubmit = async () => {
    if (!token || !consent) return;
    setSubmitting(true);
    setError(null);
    setMissing([]);
    try {
      const res = await submitKyc(token);
      setKyc(res);
      setPhase('status');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'kyc_incomplete') {
        // The server lists everything that is still missing, so the user sees
        // the whole list at once instead of one problem per attempt.
        setMissing(err.missing);
        setError(
          err.missing.length
            ? 'Some information is still missing. Use the button below to fill it in.'
            : err.message
        );
      } else {
        setError(describeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Jump to the step that fixes the first missing item. */
  const goToMissing = () => {
    const first = missing[0];
    if (!first) return;
    setMissing([]);
    setError(null);
    setStep(stepForMissing(first));
  };

  const handleSwitchToLive = useCallback(async () => {
    if (!token) return;
    try {
      await request<AccountStatus>('/account/type/', {
        method: 'POST',
        token,
        body: { accountType: 'live' },
      });
      navigate('/account');
    } catch (err) {
      setError(describeError(err));
    }
  }, [token, navigate]);

  // The review screen is rendered from the server's copy of the profile, not
  // from browser state. That is the whole point: the wizard used to show the
  // number the user had typed even though the server had never received it.
  const serverDetails = kyc?.details ?? details;
  const serverDocType = kyc?.docType ?? null;
  const serverHasNumber = !!kyc?.hasDocumentNumber;
  const serverLast4 = kyc?.documentNumberLast4 ?? '';
  const serverKinds = new Set((kyc?.documents ?? []).map((d) => d.kind));
  const serverNumberOnly = !!serverDocType && NUMBER_ONLY_TYPES.has(serverDocType);
  const serverNeedsBack = !!serverDocType && HAS_BACK_TYPES.has(serverDocType);

  // The full number is never sent back by the API (only its last four
  // digits), so the field starts empty when a number is already stored.
  const numberHint = kyc?.hasDocumentNumber
    ? `A number ending in ${kyc.documentNumberLast4} is already saved. Leave this blank to keep it, or type a new number to replace it.`
    : docType === 'bvn'
    ? 'Your BVN is encrypted at rest and never shown in full again.'
    : undefined;

  if (loading) {
    return (
      <DashboardLayout title="Verification">
        <p style={{ fontFamily: 'Inter', color: 'var(--sub)' }}>Loading…</p>
      </DashboardLayout>
    );
  }

  if (phase === 'status' && kyc) {
    return (
      <DashboardLayout title="Verification">
        <StatusScreen
          kyc={kyc}
          onSwitchLive={handleSwitchToLive}
          onResubmit={() => {
            setPhase('wizard');
            setStep(1);
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Identity verification">
      <p
        style={{
          fontFamily: 'Inter',
          fontSize: '13px',
          color: 'var(--sub)',
          marginTop: '-8px',
          marginBottom: '18px',
        }}
      >
        Verify your identity to unlock live trading, funding and withdrawals.
        Your documents are encrypted and only seen by our review team.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{ fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
          >
            Step {step} of {TOTAL_STEPS}
          </span>
          <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
            {step === 1 && 'Personal details'}
            {step === 2 && 'Identity document'}
            {step === 3 && 'Selfie'}
            {step === 4 && 'Review & submit'}
          </span>
        </div>
        <div
          style={{
            height: '6px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--panel2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(step / TOTAL_STEPS) * 100}%`,
              backgroundColor: 'var(--gold)',
              borderRadius: 'var(--radius-pill)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: 'var(--loss)',
            padding: '12px 16px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--loss)',
            borderRadius: 'var(--radius-input)',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {missing.length > 0 && (
        <div
          role="alert"
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: 'var(--text)',
            padding: '12px 16px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--gold)',
            borderRadius: 'var(--radius-input)',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Still needed:</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px', lineHeight: 1.7 }}>
            {missing.map((key) => (
              <li key={key}>{MISSING_LABELS[key] || key}</li>
            ))}
          </ul>
          <button type="button" onClick={goToMissing} style={primaryBtnStyle}>
            Fix this
          </button>
        </div>
      )}

      {step === 1 && (
        <Card title="Personal details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <Field label="Full legal name">
              <input
                value={details.fullName}
                onChange={(e) => setDetail('fullName', e.target.value)}
                placeholder="e.g. Adaeze Okoro"
                style={inputStyle}
              />
              {errors.fullName && <InlineError text={errors.fullName} />}
            </Field>
            <Field label="Date of birth" hint="You must be 18 or older.">
              <input
                type="date"
                value={details.dateOfBirth}
                onChange={(e) => setDetail('dateOfBirth', e.target.value)}
                style={inputStyle}
              />
              {errors.dateOfBirth && <InlineError text={errors.dateOfBirth} />}
            </Field>
            <Field label="Country">
              <select
                value={details.country}
                onChange={(e) => setDetail('country', e.target.value)}
                style={{ ...inputStyle, fontFamily: 'Inter' }}
              >
                <option>Nigeria</option>
                <option>Ghana</option>
                <option>Kenya</option>
                <option>South Africa</option>
                <option>United Kingdom</option>
                <option>United States</option>
                <option>Other</option>
              </select>
              {errors.country && <InlineError text={errors.country} />}
            </Field>
            <Field label="Phone number">
              <input
                type="tel"
                value={details.phone}
                onChange={(e) => setDetail('phone', e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
              />
              {errors.phone && <InlineError text={errors.phone} />}
            </Field>
            <Field label="Residential address (street)" style={{ gridColumn: '1 / -1' }}>
              <input
                value={details.addressLine}
                onChange={(e) => setDetail('addressLine', e.target.value)}
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                style={inputStyle}
              />
              {errors.addressLine && <InlineError text={errors.addressLine} />}
            </Field>
            <Field label="City">
              <input
                value={details.city}
                onChange={(e) => setDetail('city', e.target.value)}
                placeholder="e.g. Lagos"
                style={inputStyle}
              />
              {errors.city && <InlineError text={errors.city} />}
            </Field>
            <Field label="State / province">
              <input
                value={details.state}
                onChange={(e) => setDetail('state', e.target.value)}
                placeholder="e.g. Lagos"
                style={inputStyle}
              />
              {errors.state && <InlineError text={errors.state} />}
            </Field>
            <Field label="Postal code">
              <input
                value={details.postalCode}
                onChange={(e) => setDetail('postalCode', e.target.value)}
                placeholder="e.g. 106104"
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
              />
              {errors.postalCode && <InlineError text={errors.postalCode} />}
            </Field>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Identity document">
          <Field label="Document type">
            <select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value);
                setErrors({});
              }}
              style={{ ...inputStyle, fontFamily: 'Inter' }}
            >
              {docTypes.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {errors.docType && <InlineError text={errors.docType} />}
          </Field>

          <div style={{ height: '14px' }} />

          <Field
            label={numberOnly ? 'Document number' : 'Document number (as printed)'}
            hint={numberHint}
          >
            <input
              value={docNumber}
              onChange={(e) => {
                setDocNumber(e.target.value);
                setErrors((er) => ({ ...er, docNumber: '' }));
              }}
              placeholder={kyc?.hasDocumentNumber ? 'Leave blank to keep the saved number' : 'e.g. 01234567890'}
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
            />
            {errors.docNumber && <InlineError text={errors.docNumber} />}
          </Field>

          {!numberOnly && (
            <>
              <div style={{ height: '18px' }} />
              <UploadSlot
                label="Front of document"
                kind="id_front"
                file={frontFile}
                existing={kyc?.documents.find((d) => d.kind === 'id_front')}
                uploading={uploadKind === 'id_front'}
                uploadPct={uploadPct}
                onUpload={uploadFile}
                onRemove={removeDocument}
              />
              {needsBack && (
                <>
                  <div style={{ height: '14px' }} />
                  <UploadSlot
                    label="Back of document"
                    kind="id_back"
                    file={backFile}
                    existing={kyc?.documents.find((d) => d.kind === 'id_back')}
                    uploading={uploadKind === 'id_back'}
                    uploadPct={uploadPct}
                    onUpload={uploadFile}
                    onRemove={removeDocument}
                  />
                </>
              )}
            </>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card title="Selfie">
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-input)',
              backgroundColor: 'var(--panel2)',
              border: '1px solid var(--border)',
              marginBottom: '16px',
            }}
          >
            <p
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text)',
                margin: '0 0 8px',
              }}
            >
              Before you take the photo
            </p>
            <ul
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                color: 'var(--sub)',
                margin: 0,
                paddingLeft: '18px',
                lineHeight: 1.7,
              }}
            >
              <li>Good lighting — no glare on the document.</li>
              <li>Hold your document next to your face.</li>
              <li>Make sure your full face and the document are visible.</li>
              <li>No hats, sunglasses or masks.</li>
            </ul>
          </div>

          <UploadSlot
            label="Selfie with document"
            kind="selfie"
            file={selfieFile}
            existing={kyc?.documents.find((d) => d.kind === 'selfie')}
            uploading={uploadKind === 'selfie'}
            uploadPct={uploadPct}
            onUpload={uploadFile}
            onRemove={removeDocument}
            capture
          />
          {errors.selfie && <InlineError text={errors.selfie} />}
        </Card>
      )}

      {step === 4 && (
        <Card title="Review & submit">
          <ReviewSection
            title="Personal details"
            onEdit={() => setStep(1)}
            rows={[
              ['Full name', serverDetails.fullName],
              ['Date of birth', serverDetails.dateOfBirth],
              ['Country', serverDetails.country],
              ['Phone', serverDetails.phone],
              [
                'Address',
                `${serverDetails.addressLine}, ${serverDetails.city}, ${serverDetails.state} ${serverDetails.postalCode}`,
              ],
            ]}
          />
          <ReviewSection
            title="Identity document"
            onEdit={() => setStep(2)}
            rows={[
              ['Type', docTypeLabel(serverDocType)],
              [
                'Number',
                serverHasNumber ? `•••• ${serverLast4}` : 'Not saved yet',
              ],
              [
                'Files',
                serverNumberOnly
                  ? 'Number entry only'
                  : [
                      serverKinds.has('id_front') ? 'Front ✓' : 'Front ✗',
                      serverNeedsBack
                        ? serverKinds.has('id_back')
                          ? 'Back ✓'
                          : 'Back ✗'
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', '),
              ],
            ]}
          />
          <ReviewSection
            title="Selfie"
            onEdit={() => setStep(3)}
            rows={[
              ['Photo', serverKinds.has('selfie') ? 'Uploaded ✓' : 'Missing ✗'],
            ]}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginTop: '18px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <span style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--text)' }}>
              I confirm the information is correct and agree to the{' '}
              <span style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                Privacy Policy
              </span>
              .
            </span>
          </label>
          {errors.consent && <InlineError text={errors.consent} />}
        </Card>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            disabled={saving || submitting}
            style={secondaryBtnStyle}
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={saving}
            style={primaryBtnStyle}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!consent) {
                setErrors({ consent: 'Please confirm the declaration before submitting.' });
                return;
              }
              handleSubmit();
            }}
            disabled={submitting}
            style={{ ...primaryBtnStyle, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InlineError({ text }: { text: string }) {
  return (
    <span
      style={{
        display: 'block',
        fontFamily: 'Inter',
        fontSize: '11px',
        color: 'var(--loss)',
        marginTop: '6px',
      }}
    >
      {text}
    </span>
  );
}

function UploadSlot({
  label,
  kind,
  file,
  existing,
  uploading,
  uploadPct,
  onUpload,
  onRemove,
  capture,
}: {
  label: string;
  kind: KycDocKind;
  file: File | null;
  existing?: KycDocument;
  uploading: boolean;
  uploadPct: number | null;
  onUpload: (kind: KycDocKind, file: File) => void;
  onRemove: (kind: KycDocKind) => void;
  capture?: boolean;
}) {
  const has = !!file || !!existing;
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  return (
    <div>
      <span
        style={{
          display: 'block',
          fontFamily: 'Inter',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--sub)',
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      {uploading ? (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--panel2)',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter',
              fontSize: '12px',
              color: 'var(--sub)',
              marginBottom: '8px',
            }}
          >
            Uploading… {uploadPct ?? 0}%
          </div>
          <div
            style={{
              height: '6px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--panel)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadPct ?? 0}%`,
                backgroundColor: 'var(--gold)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      ) : has ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--panel2)',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                backgroundColor: 'var(--panel)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color="var(--sub)" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="truncate"
              style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--text)' }}
            >
              {file?.name || 'Uploaded document'}
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'var(--profit)' }}>
              Uploaded ✓{file ? ` · ${fmtBytes(file.size)}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(kind)}
            aria-label={`Remove ${label}`}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={16} color="var(--loss)" />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--panel2)',
              fontFamily: 'Inter',
              fontSize: '13px',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            <Camera size={16} color="var(--gold)" />
            {capture ? 'Take a photo' : 'Upload photo'}
            {/* capture=environment opens the rear camera on mobile */}
            <input
              type="file"
              accept={capture ? 'image/*' : 'image/jpeg,image/png,application/pdf'}
              capture={capture ? 'environment' : undefined}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(kind, f);
                e.target.value = '';
              }}
            />
          </label>
          {!capture && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                fontFamily: 'Inter',
                fontSize: '13px',
                color: 'var(--sub)',
                cursor: 'pointer',
              }}
            >
              <Image size={16} />
              Choose a file
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(kind, f);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      )}
      <span
        style={{
          display: 'block',
          fontFamily: 'Inter',
          fontSize: '11px',
          color: 'var(--faint)',
          marginTop: '6px',
        }}
      >
        JPG, PNG or PDF · max 5 MB
      </span>
    </div>
  );
}

function ReviewSection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: 'var(--text)' }}>
          {title}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'Inter',
            fontSize: '12px',
            color: 'var(--gold)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Edit
        </button>
      </div>
      <div
        style={{
          borderRadius: 'var(--radius-input)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {rows.map(([k, v], i) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 14px',
              backgroundColor: i % 2 ? 'var(--panel2)' : 'var(--panel)',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>{k}</span>
            <span
              className="truncate"
              style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text)', textAlign: 'right' }}
            >
              {v || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusScreen({
  kyc,
  onSwitchLive,
  onResubmit,
}: {
  kyc: KycStatusResponse;
  onSwitchLive: () => void;
  onResubmit: () => void;
}) {
  const submittedAt = kyc.submittedAt ? new Date(kyc.submittedAt) : null;
  const reviewedAt = kyc.reviewedAt ? new Date(kyc.reviewedAt) : null;

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', color: 'var(--text)' }}>
            {kyc.status === 'verified' && 'Identity verified'}
            {kyc.status === 'pending' && 'Under review'}
            {kyc.status === 'rejected' && 'Verification rejected'}
            {kyc.status === 'none' && 'Not submitted'}
          </h3>
          <StatusBadge status={kyc.status} />
        </div>

        {kyc.status === 'pending' && (
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>
            We usually respond within 24 hours. You will get an email as soon
            as your documents have been reviewed.
          </p>
        )}
        {kyc.status === 'verified' && (
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--profit)' }}>
            Your identity is verified. You can now use the live (real-money)
            account, fund your wallet and withdraw.
          </p>
        )}
        {kyc.status === 'rejected' && (
          <>
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--loss)' }}>
              {kyc.rejectionReason ||
                'Your documents could not be accepted. Please review the requirements and resubmit.'}
            </p>
            <button
              type="button"
              onClick={onResubmit}
              style={{ ...primaryBtnStyle, marginTop: '14px' }}
            >
              Resubmit
            </button>
          </>
        )}
        {kyc.status === 'none' && (
          <button type="button" onClick={onResubmit} style={primaryBtnStyle}>
            Start verification
          </button>
        )}
      </Card>

      {/* Timeline: Submitted -> In review -> Result */}
      <div style={{ marginTop: '18px' }}>
        <Timeline
          steps={[
            {
              label: 'Submitted',
              state: submittedAt ? 'done' : 'todo',
              note: submittedAt ? submittedAt.toLocaleString() : undefined,
            },
            {
              label: 'In review',
              state:
                kyc.status === 'pending'
                  ? 'current'
                  : reviewedAt || kyc.status === 'verified'
                  ? 'done'
                  : 'todo',
            },
            {
              label: 'Result',
              state:
                kyc.status === 'verified'
                  ? 'done'
                  : kyc.status === 'rejected'
                  ? 'failed'
                  : 'todo',
              note: reviewedAt ? reviewedAt.toLocaleString() : undefined,
            },
          ]}
        />
      </div>

      {kyc.status === 'verified' && (
        <button
          type="button"
          onClick={onSwitchLive}
          style={{ ...primaryBtnStyle, marginTop: '20px' }}
        >
          <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
          Switch to LIVE account
        </button>
      )}
    </>
  );
}

function Timeline({
  steps,
}: {
  steps: { label: string; state: 'done' | 'current' | 'todo' | 'failed'; note?: string }[];
}) {
  const color = (s: typeof steps[number]['state']) =>
    s === 'done' ? 'var(--profit)' : s === 'current' ? 'var(--gold)' : s === 'failed' ? 'var(--loss)' : 'var(--faint)';
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
      }}
    >
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: `2px solid ${color(s.state)}`,
                backgroundColor: s.state === 'done' ? color(s.state) : 'transparent',
                flexShrink: 0,
              }}
            />
            {i < steps.length - 1 && (
              <div
                style={{
                  width: '2px',
                  flex: 1,
                  minHeight: '26px',
                  backgroundColor: 'var(--border)',
                }}
              />
            )}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? '16px' : 0 }}>
            <div
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '13px',
                fontWeight: 600,
                color: color(s.state),
              }}
            >
              {s.label}
            </div>
            {s.note && (
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'var(--faint)' }}>
                {s.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 18px',
  backgroundColor: 'var(--gold)',
  border: 'none',
  borderRadius: 'var(--radius-pill)',
  color: '#0D0F1A',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
};

const secondaryBtnStyle: React.CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 18px',
  backgroundColor: 'var(--panel2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-pill)',
  color: 'var(--text)',
  cursor: 'pointer',
};
