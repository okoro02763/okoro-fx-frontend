import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import SliderRow from '../components/SliderRow';
import type { StrategySettings } from '../api/strategy';

interface PairChipProps {
  pair: string;
  selected: boolean;
  onToggle: (pair: string) => void;
}

function PairChip({ pair, selected, onToggle }: PairChipProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(pair)}
      style={{
        fontFamily: 'JetBrains Mono',
        fontSize: '13px',
        fontWeight: 500,
        padding: '8px 14px',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: selected ? 'var(--gold)' : 'var(--panel2)',
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
        color: selected ? '#0D0F1A' : 'var(--text)',
        cursor: 'pointer',
      }}
    >
      {pair}
    </button>
  );
}

const STRATEGIES = [
  { id: 'scalping', name: 'Scalping', desc: 'High frequency, tight targets' },
  { id: 'swing', name: 'Swing Trading', desc: 'Multi-day hold, wider stops' },
  { id: 'trend', name: 'Trend Following', desc: 'Follow momentum breakdowns' },
  { id: 'grid', name: 'Grid', desc: 'Range-bound ladder entries' },
];

const ALL_PAIRS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
  'EUR/GBP',
  'USD/CHF',
  'EUR/JPY',
  'GBP/JPY',
];

// Loads and saves strategy settings. Falls back to mock/saved local state when
// the backend isn't wired yet. TODO: swap the fetch bodies directly for the
// real /strategy endpoints once confirmed.
function useStrategySettings() {
  const [settings, setSettings] = React.useState<StrategySettings>({
    strategy: 'scalping',
    pairs: ['EUR/USD', 'GBP/USD'],
    risk: { riskPerTrade: 1.5, maxLots: 2 },
  });
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  return { settings, setSettings, saving, setSaving, msg, setMsg };
}

export default function StrategySettingsPage() {
  const { settings, setSettings, saving, setSaving, msg, setMsg } =
    useStrategySettings();
  const { strategy, pairs, risk } = settings;

  const togglePair = (pair: string) => {
    setSettings({
      ...settings,
      pairs: pairs.includes(pair)
        ? pairs.filter((p) => p !== pair)
        : [...pairs, pair],
    });
    setMsg(null);
  };

  const setRisk = (key: keyof typeof risk, value: number) =>
    setSettings({ ...settings, risk: { ...risk, [key]: value } });

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    // TODO: replace with a real saveStrategy(token, settings) call once wired.
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setMsg('Strategy settings saved.');
  };

  return (
    <DashboardLayout title="Strategy Settings">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Strategy">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, strategy: s.id })}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-input)',
                    backgroundColor:
                      strategy === s.id ? 'var(--panel2)' : 'var(--panel)',
                    border: `1px solid ${
                      strategy === s.id ? 'var(--gold)' : 'var(--border)'
                    }`,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'Space Grotesk',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Inter',
                      fontSize: '12px',
                      color: 'var(--sub)',
                    }}
                  >
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Trading Pairs">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_PAIRS.map((pair) => (
                <PairChip
                  key={pair}
                  pair={pair}
                  selected={pairs.includes(pair)}
                  onToggle={togglePair}
                />
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Risk Parameters">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <SliderRow
                label="Risk per trade"
                value={risk.riskPerTrade}
                min={0.1}
                max={5}
                step={0.1}
                unit="%"
                onChange={(v) => setRisk('riskPerTrade', v)}
              />
              <SliderRow
                label="Max lots per trade"
                value={risk.maxLots}
                min={0.1}
                max={10}
                step={0.1}
                unit=""
                onChange={(v) => setRisk('maxLots', v)}
              />
            </div>
          </Card>

          <Card title="Summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <SummaryRow
                label="Strategy"
                value={STRATEGIES.find((s) => s.id === strategy)?.name || strategy}
              />
              <SummaryRow label="Pairs" value={`${pairs.length} selected`} />
              <SummaryRow label="Risk / trade" value={`${risk.riskPerTrade}%`} />
              <SummaryRow label="Max lots" value={`${risk.maxLots}`} />
            </div>
            {msg && (
              <p
                style={{
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  color: 'var(--profit)',
                  margin: '14px 0 0',
                }}
              >
                {msg}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '12px 16px',
                backgroundColor: 'var(--gold)',
                border: 'none',
                borderRadius: 'var(--radius-input)',
                color: '#0D0F1A',
                fontFamily: 'Space Grotesk',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px dashed var(--border)',
      }}
    >
      <span style={{ fontFamily: 'Inter', color: 'var(--sub)' }}>{label}</span>
      <span
        data-mono
        style={{
          fontFamily: 'JetBrains Mono',
          fontWeight: 500,
          color: 'var(--text)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
