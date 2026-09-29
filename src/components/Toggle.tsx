import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled,
  style,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        ...style,
      }}
    >
      <span
        style={{
          width: '46px',
          height: '26px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: checked ? 'var(--gold)' : 'var(--panel2)',
          border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: checked ? 'var(--bg)' : 'var(--sub)',
            transition: 'left 0.2s ease, background-color 0.2s ease',
          }}
        />
      </span>
      {label && (
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text)',
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
