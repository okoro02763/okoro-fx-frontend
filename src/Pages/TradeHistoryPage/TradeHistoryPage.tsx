import React, { useState } from 'react';
import TradeHistory from '../../components/TradeHistory/TradeHistory';

const TradeHistoryPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="trade-history-page">
      <h2>Trade History</h2>
      <button onClick={() => setRefreshTrigger(prev => prev + 1)} style={{ marginBottom: '10px' }}>
        Refresh
      </button>
      <TradeHistory refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default TradeHistoryPage;