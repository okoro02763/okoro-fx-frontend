import React from 'react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: number | null; // percent; positive = profit color, negative = loss
  suffix?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function StatCard({
  label,
  value,
  delta,
  suffix,
  icon,
  style,
}: StatCardProps) {
  const hasDelta = delta !== undefined && delta !== null;
  const deltaPositive = (delta ?? 0) >= 0;

  return (
    <div
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--sub)',
          }}
        >
          {label}
        </span>
        {icon}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
        }}
      >
        <span
          data-mono
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1,
          }}
        >
          {value}
          {suffix && (
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--sub)',
                marginLeft: '2px',
              }}
            >
              {suffix}
            </span>
          )}
        </span>
        {hasDelta && (
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '12px',
              fontWeight: 500,
              color: deltaPositive ? 'var(--profit)' : 'var(--loss)',
            }}
          >
            {deltaPositive ? '+' : ''}
            {delta?.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
