import React from 'react';

export interface SessionInfo {
  city: string;
  open: boolean;
  time: string;
}

interface SessionStripProps {
  sessions: SessionInfo[];
  style?: React.CSSProperties;
}

export default function SessionStrip({ sessions, style }: SessionStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {sessions.map((session) => (
        <div
          key={session.city}
          style={{
            flex: '1 1 0',
            minWidth: '120px',
            padding: '10px 14px',
            backgroundColor: session.open ? 'var(--panel2)' : 'var(--panel)',
            border: `1px solid ${
              session.open ? 'var(--gold)' : 'var(--border)'
            }`,
            borderRadius: 'var(--radius-input)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            opacity: session.open ? 1 : 0.55,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {session.city}
            </span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: session.open ? 'var(--profit)' : 'var(--faint)',
                flexShrink: 0,
              }}
            />
          </div>
          <span
            data-mono
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '14px',
              fontWeight: 500,
              color: session.open ? 'var(--gold)' : 'var(--sub)',
            }}
          >
            {session.time}
          </span>
        </div>
      ))}
    </div>
  );
}
