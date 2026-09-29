import React, { useEffect, useState } from 'react';
import { apiService } from '../../Services/api';
import type { Trade } from '../../types';

interface TradeHistoryProps {
  refreshTrigger: number;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ refreshTrigger }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTradeHistory = async () => {
    setLoading(true);
    try {
      const tradeData = await apiService.getTrades();
      setTrades(tradeData);
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradeHistory();
  }, [refreshTrigger]);

  if (loading) {
    return <div>Loading trade history...</div>;
  }

  return (
    <div className="card">
      <h3>Trade History</h3>
      {trades.length === 0 ? (
        <div>No trades executed yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pair</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>P&L</th>
              <th>Status</th>
              <th>Opened At</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td>{trade.id}</td>
                <td>{trade.symbol}</td>
                <td style={{ color: trade.trade_type === 'BUY' ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{trade.trade_type}</td>
                <td>{trade.quantity}</td>
                <td>{trade.entry_price.toFixed(5)}</td>
                <td>{trade.exit_price ? trade.exit_price.toFixed(5) : '-'}</td>
                <td style={{ color: trade.profit_loss ? (trade.profit_loss >= 0 ? '#28a745' : '#dc3545') : 'inherit', fontWeight: 'bold' }}>
                  {trade.profit_loss ? `${trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}` : '-'}
                </td>
                <td>{trade.status}</td>
                <td>{new Date(trade.opened_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TradeHistory;