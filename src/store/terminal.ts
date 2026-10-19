import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChartType } from '../types/binary';

export interface Timeframe {
  key: string;
  label: string;
  seconds: number;
}

/**
 * Timeframes offered by the terminal. Sub-minute frames are built from live
 * ticks; everything else is resampled from exchange history.
 */
export const TIMEFRAMES: Timeframe[] = [
  { key: '5s', label: '5s', seconds: 5 },
  { key: '10s', label: '10s', seconds: 10 },
  { key: '15s', label: '15s', seconds: 15 },
  { key: '30s', label: '30s', seconds: 30 },
  { key: '1m', label: '1m', seconds: 60 },
  { key: '2m', label: '2m', seconds: 120 },
  { key: '3m', label: '3m', seconds: 180 },
  { key: '5m', label: '5m', seconds: 300 },
  { key: '10m', label: '10m', seconds: 600 },
  { key: '15m', label: '15m', seconds: 900 },
  { key: '30m', label: '30m', seconds: 1800 },
  { key: '1h', label: '1h', seconds: 3600 },
  { key: '4h', label: '4h', seconds: 14400 },
  { key: '1d', label: '1d', seconds: 86400 },
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
  { key: 'area', label: 'Area' },
  { key: 'candles', label: 'Candles' },
  { key: 'bars', label: 'Bars' },
  { key: 'heikin-ashi', label: 'Heikin Ashi' },
];

export type StakeMode = 'percent' | 'amount';

interface TerminalState {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  stakeMode: StakeMode;
  stakeValue: number;
  durationSeconds: number;
  pendingTrade: boolean;
  favorites: string[];
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setChartType: (chartType: ChartType) => void;
  setStakeMode: (mode: StakeMode) => void;
  setStakeValue: (value: number) => void;
  setDuration: (seconds: number) => void;
  setPendingTrade: (pending: boolean) => void;
  toggleFavorite: (symbol: string) => void;
}

export const useTerminal = create<TerminalState>()(
  persist(
    (set) => ({
      symbol: 'BTC/USD',
      timeframe: TIMEFRAMES[7],
      chartType: 'candles',
      stakeMode: 'percent',
      stakeValue: 10,
      durationSeconds: 300,
      pendingTrade: false,
      favorites: ['BTC/USD', 'ETH/USD', 'EUR/USD'],
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setChartType: (chartType) => set({ chartType }),
      setStakeMode: (stakeMode) => set({ stakeMode }),
      setStakeValue: (stakeValue) => set({ stakeValue }),
      setDuration: (durationSeconds) => set({ durationSeconds }),
      setPendingTrade: (pendingTrade) => set({ pendingTrade }),
      toggleFavorite: (symbol) =>
        set((state) => ({
          favorites: state.favorites.includes(symbol)
            ? state.favorites.filter((s) => s !== symbol)
            : [...state.favorites, symbol],
        })),
    }),
    {
      name: 'okoro_binary_terminal',
      version: 2,
      partialize: (state) => ({
        symbol: state.symbol,
        timeframe: state.timeframe,
        chartType: state.chartType,
        stakeMode: state.stakeMode,
        stakeValue: state.stakeValue,
        durationSeconds: state.durationSeconds,
        pendingTrade: state.pendingTrade,
        favorites: state.favorites,
      }),
    }
  )
);
