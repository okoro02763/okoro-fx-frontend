import { useState } from 'react';
import Sheet from './Sheet';

interface ExchangeFormModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CURRENCIES = ['USD', 'GBP', 'EUR', 'NGN', 'JPY'];

export default function ExchangeFormModal({
  open,
  onClose,
  onConfirm,
}: ExchangeFormModalProps) {
  const [target, setTarget] = useState('USD');
  const [amount, setAmount] = useState('100.00');

  return (
    <Sheet open={open} onClose={onClose} title="Exchange Form" variant="bottom">
      <div className="p-4">
        <Field label="My Currency">
          <input
            readOnly
            value="GBP"
            className="w-full bg-transparent text-[14px] font-semibold outline-none"
            style={{ color: 'var(--text)' }}
          />
        </Field>

        <Field label="New Currency">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-transparent text-[14px] font-semibold outline-none"
            style={{ color: 'var(--text)' }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} style={{ color: '#000' }}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <p className="mb-1 mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>
          You are exchanging
        </p>
        <Field label="Amount">
          <input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
            className="mono w-full bg-transparent text-[16px] font-semibold outline-none"
            style={{ color: 'var(--text)' }}
          />
        </Field>

        <p className="mb-1 mt-3 text-[12px]" style={{ color: 'var(--muted)' }}>
          You will receive
        </p>
        <Field label={target}>
          <span className="mono text-[16px] font-semibold" style={{ color: 'var(--green)' }}>
            {(Number(amount || 0) * 1.29).toFixed(2)}
          </span>
        </Field>

        <p className="mt-3 text-[11px]" style={{ color: 'var(--muted)' }}>
          Exchange Fee: 3%. 1 GBP = 1.29 USD
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3 text-[14px] font-bold text-white"
            style={{ backgroundColor: 'var(--green)' }}
          >
            Yes, proceed
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-[14px] font-bold"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--muted)' }}
          >
            No, go back
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label
      className="relative mt-2 flex flex-col rounded-xl px-3 pb-1.5 pt-4"
      style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
    >
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
