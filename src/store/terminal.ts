import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChartType } from '../types/binary';

export interface Timeframe {
  key: string;
  label: string;
  seconds: number;
}

/** Matches the intervals the backend serves (market/providers.py). */
export const TIMEFRAMES: Timeframe[] = [
  { key: '5s', label: '5s', seconds: 5 },
  { key: '15s', label: '15s', seconds: 15 },
  { key: '1m', label: '1m', seconds: 60 },
  { key: '5m', label: '5m', seconds: 300 },
  { key: '15m', label: '15m', seconds: 900 },
  { key: '1h', label: '1h', seconds: 3600 },
];

export interface Expiry {
  label: string;
  seconds: number;
}

export const EXPIRIES: Expiry[] = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
];

export const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'candles', label: 'Candles' },
  { key: 'area', label: 'Area' },
  { key: 'bars', label: 'Bars' },
  { key: 'heikin-ashi', label: 'Heikin Ashi' },
];

interface TerminalState {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  stake: number;
  durationSeconds: number;
  favorites: string[];
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setChartType: (chartType: ChartType) => void;
  setStake: (stake: number) => void;
  setDuration: (seconds: number) => void;
  toggleFavorite: (symbol: string) => void;
}

export const useTerminal = create<TerminalState>()(
  persist(
    (set) => ({
      symbol: 'EUR/USD',
      timeframe: TIMEFRAMES[2],
      chartType: 'candles',
      stake: 10,
      durationSeconds: 60,
      favorites: ['EUR/USD', 'BTC/USD', 'XAU/USD'],
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setChartType: (chartType) => set({ chartType }),
      setStake: (stake) => set({ stake }),
      setDuration: (durationSeconds) => set({ durationSeconds }),
      toggleFavorite: (symbol) =>
        set((state) => ({
          favorites: state.favorites.includes(symbol)
            ? state.favorites.filter((s) => s !== symbol)
            : [...state.favorites, symbol],
        })),
    }),
    {
      name: 'okoro_binary_terminal',
      // Only the user's preferences survive a reload; live data never does.
      partialize: (state) => ({
        symbol: state.symbol,
        timeframe: state.timeframe,
        chartType: state.chartType,
        stake: state.stake,
        durationSeconds: state.durationSeconds,
        favorites: state.favorites,
      }),
    }
  )
);
