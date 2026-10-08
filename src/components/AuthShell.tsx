import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="order-1 box-border flex min-h-screen w-full min-w-0 flex-1 items-center justify-center overflow-x-hidden bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(232,180,84,0.06),transparent)] p-5 sm:p-6 md:order-2">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <span
            className="h-3 w-3 rotate-45 rounded-[4px] bg-[#E8B454]"
            aria-hidden="true"
          />
          <span className="font-display text-[22px] font-bold tracking-[0.02em] text-[#EDEEF5]">
            {BRAND_NAME}
          </span>
        </div>

        <p className="-mt-5 mb-6 text-center text-xs font-medium uppercase tracking-[0.06em] text-[#868CA8]">
          {BRAND_TAGLINE}
        </p>

        <div className="box-border w-full rounded-[14px] border border-[#272C47] bg-[#151829] p-5 sm:p-7">
          <h1 className="font-display text-2xl font-semibold text-[#EDEEF5] md:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mb-5 mt-1.5 text-[13px] leading-snug text-[#868CA8]">
              {subtitle}
            </p>
          )}
          {children}
        </div>

        <p className="mt-5 text-center text-[13px] leading-relaxed text-[#868CA8]">
          {footer}
        </p>
      </div>
    </div>
  );
}

export function AuthLink({
  to,
  children,
  onClick,
}: {
  to?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const cls =
    'cursor-pointer bg-none p-0 text-[13px] font-semibold text-[#E8B454] no-underline';

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <Link to={to || '/'} className={cls}>
      {children}
    </Link>
  );
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function PrimaryButton({
  children,
  disabled,
  style,
}: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'var(--gold)',
        border: 'none',
        borderRadius: 'var(--radius-input)',
        color: '#0D0F1A',
        fontFamily: 'Space Grotesk',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
