import React from 'react';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  style?: React.CSSProperties;
}

export default function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  onChange,
  style,
}: SliderRowProps) {
  return (
    <div style={{ ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text)',
          }}
        >
          {label}
        </span>
        <span
          data-mono
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--gold)',
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}
