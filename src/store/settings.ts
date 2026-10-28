import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeOption = 'light' | 'twilight' | 'fullnight';

/**
 * Timezones are stored as a fixed UTC offset in minutes. That keeps every
 * formatter simple and deterministic: a timestamp is shifted by the offset and
 * read with the UTC getters. `timezoneLabel` is only for display.
 */
export const TIMEZONE_OFFSETS: { label: string; minutes: number }[] = Array.from(
  { length: 27 },
  (_, i) => {
    const hours = i - 12; // -12 .. +14
    return {
      label: hours === 0 ? 'UTC' : `UTC${hours > 0 ? '+' : ''}${hours}`,
      minutes: hours * 60,
    };
  }
);

export function browserTimezoneMinutes(): number {
  try {
    return -new Date().getTimezoneOffset();
  } catch {
    return 0;
  }
}

export function timezoneLabelFor(minutes: number): string {
  const found = TIMEZONE_OFFSETS.find((t) => t.minutes === minutes);
  if (found) return found.label;
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${m.toString().padStart(2, '0')}` : ''}`;
}

interface AppSettings {
  timezoneMinutes: number;
  autoScroll: boolean;
  gridOpacity: number;
  oneClickTrade: boolean;
  language: string;
  theme: ThemeOption;

  setTimezoneMinutes: (v: number) => void;
  setAutoScroll: (v: boolean) => void;
  setGridOpacity: (v: number) => void;
  setOneClickTrade: (v: boolean) => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: ThemeOption) => void;
}

export const useSettings = create<AppSettings>()(
  persist(
    (set) => ({
      timezoneMinutes: browserTimezoneMinutes(),
      autoScroll: true,
      gridOpacity: 50,
      oneClickTrade: false,
      language: 'en',
      theme: 'twilight',

      setTimezoneMinutes: (timezoneMinutes) => set({ timezoneMinutes }),
      setAutoScroll: (autoScroll) => set({ autoScroll }),
      setGridOpacity: (gridOpacity) =>
        set({ gridOpacity: Math.max(0, Math.min(100, gridOpacity)) }),
      setOneClickTrade: (oneClickTrade) => set({ oneClickTrade }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'korofx_settings',
      version: 2,
      migrate: (persisted: any) => {
        // v1 stored an IANA/`UTC+X` string; drop it in favour of the offset.
        if (persisted && 'timezone' in persisted) {
          delete persisted.timezone;
        }
        if (persisted && typeof persisted.timezoneMinutes !== 'number') {
          persisted.timezoneMinutes = browserTimezoneMinutes();
        }
        return persisted;
      },
    }
  )
);
