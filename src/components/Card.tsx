import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export default function Card({ children, title, style, bodyStyle }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '20px',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            ...bodyStyle,
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
