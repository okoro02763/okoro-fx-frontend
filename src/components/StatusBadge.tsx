import React from 'react';

export type VerificationStatusValue =
  | 'none'
  | 'pending'
  | 'verified'
  | 'approved'
  | 'rejected';

const STYLES: Record<
  Exclude<VerificationStatusValue, 'approved'>,
  { label: string; color: string; bg: string }
> = {
  none: { label: 'Not verified', color: '#8a90a8', bg: 'rgba(138, 144, 168, 0.12)' },
  pending: { label: 'Under review', color: '#ff9f1a', bg: 'rgba(255, 159, 26, 0.12)' },
  verified: { label: 'Verified', color: '#0fb360', bg: 'rgba(15, 179, 96, 0.12)' },
  rejected: { label: 'Rejected', color: '#ef4b3a', bg: 'rgba(239, 75, 58, 0.12)' },
};

/**
 * Small pill showing a KYC/verification status. `approved` is treated as an
 * alias of `verified` so both the legacy and new backend statuses render
 * correctly.
 */
export default function StatusBadge({
  status,
}: {
  status: VerificationStatusValue;
}) {
  const key = status === 'approved' ? 'verified' : status;
  const s = STYLES[key];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
      style={{
        fontFamily: 'Inter',
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.color}`,
      }}
    >
      {s.label}
    </span>
  );
}
