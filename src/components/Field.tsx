import React from 'react';

interface FieldProps {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  style?: React.CSSProperties;
}

export default function Field({ label, children, hint, style }: FieldProps) {
  return (
    <label style={{ display: 'block', ...style }}>
      {label && (
        <span
          style={{
            display: 'block',
            fontFamily: 'Inter',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--sub)',
            marginBottom: '6px',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
      {children}
      {hint && (
        <span
          style={{
            display: 'block',
            fontFamily: 'Inter',
            fontSize: '11px',
            color: 'var(--faint)',
            marginTop: '6px',
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: 'var(--panel2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-input)',
  color: 'var(--text)',
  fontFamily: 'JetBrains Mono',
  fontSize: '16px',
  lineHeight: 1.4,
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

export { inputStyle };
