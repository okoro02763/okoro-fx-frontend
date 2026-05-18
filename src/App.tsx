import React, { useState } from 'react';
import ForexDashboard from './Components/ForexDashboard/ForexDashboard';
import TradePanel from './Components/TradePanel/TradePanel';
import TradeHistory from './Components/TradeHistory/TradeHistory';
import DerivStatusPanel from './Components/DerivStatus/DerivStatus';

function App() {
  const [selectedPair, setSelectedPair] = useState<string>('EURUSD');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleTradeExecuted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>
          Forex Trading Platform
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Real-time forex trading powered by Deriv API
        </p>
      </header>

      {/* Deriv Status Panel */}
      <div style={{ marginBottom: '20px' }}>
        <DerivStatusPanel />
      </div>

      <div className="grid">
        <div style={{ gridColumn: 'span 2' }}>
          <ForexDashboard 
            selectedPair={selectedPair} 
            onPairSelect={setSelectedPair}
            refreshTrigger={refreshTrigger}
          />
        </div>
        
        <div>
          <TradePanel 
            selectedPair={selectedPair}
            onTradeExecuted={handleTradeExecuted}
          />
        </div>
        
      </div>

      <div style={{ marginTop: '30px' }}>
        <TradeHistory refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}

export default App;