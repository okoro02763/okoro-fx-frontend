import { Minus, Plus } from 'lucide-react';
import Sheet from './Sheet';
import { TIMEZONE_OFFSETS, useSettings } from '../../store/settings';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'twilight', label: 'Twilight' },
  { value: 'fullnight', label: 'Full Night' },
];

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked ? 'var(--blue)' : 'var(--panel-2)', border: '1px solid var(--border)' }}
    >
      <span
        className="absolute top-[2px] h-[16px] w-[16px] rounded-full transition-all"
        style={{ left: checked ? '20px' : '2px', backgroundColor: '#fff' }}
      />
    </button>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    timezoneMinutes,
    autoScroll,
    gridOpacity,
    oneClickTrade,
    language,
    theme,
    setTimezoneMinutes,
    setAutoScroll,
    setGridOpacity,
    setOneClickTrade,
    setLanguage,
    setTheme,
  } = useSettings();

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="px-4 py-3 space-y-4">
        {/* Language */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
            Timezone
          </label>
          <select
            value={timezoneMinutes}
            onChange={(e) => setTimezoneMinutes(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {TIMEZONE_OFFSETS.map((tz) => (
              <option key={tz.label} value={tz.minutes}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
            Theme
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grid opacity */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
            Grid opacity
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGridOpacity(gridOpacity - 10)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
            >
              <Minus size={14} color="var(--text)" />
            </button>
            <div className="flex-1 text-center text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              {gridOpacity}%
            </div>
            <button
              type="button"
              onClick={() => setGridOpacity(gridOpacity + 10)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
            >
              <Plus size={14} color="var(--text)" />
            </button>
          </div>
        </div>

        {/* Auto-scrolling */}
        <div className="flex items-start justify-between gap-3 py-2">
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
              Auto-scrolling
            </div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Automatic graphic scrolling
            </div>
          </div>
          <Switch checked={autoScroll} onChange={setAutoScroll} />
        </div>

        {/* 1-click trade */}
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            1-click trade
          </div>
          <Switch checked={oneClickTrade} onChange={setOneClickTrade} />
        </div>
      </div>
    </Sheet>
  );
}
