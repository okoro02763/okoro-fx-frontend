import React, { useState } from 'react';
import { apiService } from '../../Services/api';
import type { TradeRequest } from '../../types';

interface TradePanelProps {
  selectedPair: string;
  onTradeExecuted: () => void;
}

const TradePanel: React.FC<TradePanelProps> = ({ selectedPair, onTradeExecuted }) => {
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrade = async () => {
    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tradeData: TradeRequest = {
        symbol: selectedPair,
        trade_type: tradeType,
        quantity,
      };
      await apiService.placeTrade(tradeData);
      onTradeExecuted();
      setQuantity(0);
    } catch (err) {
      setError('Failed to execute trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trade-panel">
      <h3>Trade {selectedPair}</h3>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px' }}>
          <input
            type="radio"
            value="BUY"
            checked={tradeType === 'BUY'}
            onChange={() => setTradeType('BUY')}
          /> BUY
        </label>
        <label>
          <input
            type="radio"
            value="SELL"
            checked={tradeType === 'SELL'}
            onChange={() => setTradeType('SELL')}
          /> SELL
        </label>
      </div>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        placeholder="Enter quantity"
        style={{ width: '100%', marginBottom: '10px' }}
      />
      <button onClick={handleTrade} disabled={loading}>
        {loading ? 'Placing Trade...' : 'Place Trade'}
      </button>
      {error && <div className="error" style={{ color: 'red', marginTop: '5px' }}>{error}</div>}
    </div>
  );
};

export default TradePanel;