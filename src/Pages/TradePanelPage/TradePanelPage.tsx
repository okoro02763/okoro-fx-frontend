import React, { useState, useEffect } from 'react';
import TradePanel from '../../Components/TradePanel/TradePanel';
import TradeHistory from '../../Components/TradeHistory/TradeHistory';
import { apiService } from '../../Services/api';
import type { CurrencyPair } from '../../types';

const TradePanelPage: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<CurrencyPair | null>(null);
  const [tradeHistoryRefresh, setTradeHistoryRefresh] = useState(0);

  useEffect(() => {
    const fetchCurrencyPairs = async () => {
      try {
        const pairs = await apiService.getCurrencyPairs();
        if (pairs.length > 0) {
          setSelectedPair(pairs[0]);
        }
      } catch (error) {
        console.error('Failed to fetch currency pairs:', error);
      }
    };

    fetchCurrencyPairs();
  }, []);

  const handleTradeExecution = () => {
    setTradeHistoryRefresh(prev => prev + 1);
  };

  return (
    <div className="trade-panel-page">
      <h1>Trade Panel</h1>
      {selectedPair && (
        <TradePanel
          selectedPair={selectedPair.symbol}
          onTradeExecuted={handleTradeExecution}
        />
      )}
      <TradeHistory refreshTrigger={tradeHistoryRefresh} />
    </div>
  );
};

export default TradePanelPage;