import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, AlertCircle } from 'lucide-react';
import { apiService } from '../../Services/api';
import type { LivePrice, PriceHistory, TechnicalAnalysis, CurrencyPair } from '../../types';

interface ForexDashboardProps {
  selectedPair: string;
  onPairSelect: (pair: string) => void;
  refreshTrigger: number;
}

const ForexDashboard: React.FC<ForexDashboardProps> = ({ selectedPair, onPairSelect, refreshTrigger }) => {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrencyPairs();
    const interval = setInterval(fetchLivePrices, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPair) {
      fetchPriceHistory();
      fetchTechnicalAnalysis();
    }
  }, [selectedPair, refreshTrigger]);

  const fetchCurrencyPairs = async () => {
    try {
      const pairs = await apiService.getCurrencyPairs();
      setCurrencyPairs(pairs);
      setError(null);
    } catch (err) {
      setError('Failed to fetch currency pairs');
      console.error('Currency pairs error:', err);
    }
  };

  const fetchLivePrices = async () => {
    try {
      const prices = await apiService.getLivePrices();
      setLivePrices(prices);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to fetch live prices');
      console.error('Live prices error:', err);
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const history = await apiService.getPriceHistory(selectedPair);
      setPriceHistory(history);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    }
  };

  const fetchTechnicalAnalysis = async () => {
    try {
      const analysis = await apiService.getTechnicalAnalysis(selectedPair);
      setTechnicalAnalysis(analysis);
    } catch (err) {
      console.error('Failed to fetch technical analysis:', err);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'BEARISH':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const getPriceChange = (prices: LivePrice[], symbol: string) => {
    const currentPrice = prices.find(p => p.symbol === symbol);
    if (!currentPrice || priceHistory.length < 2) return { change: 0, percentage: 0 };
    
    const previousPrice = priceHistory[priceHistory.length - 2]?.close || 0;
    const current = (currentPrice.bid + currentPrice.ask) / 2;
    const change = current - previousPrice;
    const percentage = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
    
    return { change, percentage };
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <Activity className="w-6 h-6 animate-spin mr-2" />
          <span>Loading market data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '20px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24'
        }}>
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  const selectedPairData = livePrices.find(p => p.symbol === selectedPair);
  const priceChange = getPriceChange(livePrices, selectedPair);

  return (
    <div>
      {/* Currency Pair Selector */}
      <div className="card">
        <h3 style={{ 
          marginBottom: '15px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <BarChart3 className="w-5 h-5" />
          Select Currency Pair
        </h3>
        <select 
          className="select"
          value={selectedPair} 
          onChange={(e) => onPairSelect(e.target.value)}
          style={{ fontSize: '16px', fontWeight: '600' }}
        >
          {currencyPairs.map(pair => (
            <option key={pair.id} value={pair.symbol}>{pair.symbol} - {pair.name}</option>
          ))}
        </select>
      </div>

      {/* Live Prices Grid */}
      <div className="card">
        <h3 style={{ 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Activity className="w-5 h-5 text-blue-600" />
          Live Market Prices
          <span style={{ 
            fontSize: '12px', 
            backgroundColor: '#d4edda', 
            color: '#155724',
            padding: '2px 8px',
            borderRadius: '12px',
            marginLeft: 'auto'
          }}>
            Live
          </span>
        </h3>
        <div className="price-grid">
          {livePrices.map((price) => {
            const change = getPriceChange(livePrices, price.symbol);
            return (
              <div 
                key={price.symbol} 
                className={`price-card ${selectedPair === price.symbol ? 'selected' : ''}`}
                onClick={() => onPairSelect(price.symbol)}
                style={{ 
                  cursor: 'pointer',
                  borderLeft: selectedPair === price.symbol ? '4px solid #28a745' : '4px solid #007bff',
                  transition: 'all 0.3s ease',
                  transform: selectedPair === price.symbol ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: selectedPair === price.symbol ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div className="price-symbol">{price.symbol}</div>
                <div className="price-value">
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                    Bid: {formatPrice(price.bid)}
                  </span>
                </div>
                <div className="price-value">
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    Ask: {formatPrice(price.ask)}
                  </span>
                </div>
                <div className="price-spread">
                  Spread: {formatPrice(price.spread)} ({((price.spread / price.bid) * 100).toFixed(2)}%)
                </div>
                {change.percentage !== 0 && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: change.change >= 0 ? '#28a745' : '#dc3545',
                    fontWeight: 'bold',
                    marginTop: '5px'
                  }}>
                    {change.change >= 0 ? '+' : ''}{change.percentage.toFixed(2)}%
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '5px' }}>
                  {new Date(price.timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Pair Details */}
      {selectedPairData && (
        <div className="card">
          <h3 style={{ 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <TrendingUp className="w-5 h-5 text-blue-600" />
            {selectedPair} Market Analysis
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            {/* Current Prices */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ marginBottom: '15px', color: '#495057' }}>Current Prices</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>Bid Price:</span>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '18px', 
                    color: '#28a745',
                    fontWeight: 'bold'
                  }}>
                    {formatPrice(selectedPairData.bid)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>Ask Price:</span>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '18px', 
                    color: '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {formatPrice(selectedPairData.ask)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>Spread:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px' }}>
                    {formatPrice(selectedPairData.spread)}
                  </span>
                </div>
                {priceChange.percentage !== 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: priceChange.change >= 0 ? '#d4edda' : '#f8d7da',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontWeight: '600' }}>24h Change:</span>
                    <span style={{ 
                      color: priceChange.change >= 0 ? '#155724' : '#721c24',
                      fontWeight: 'bold'
                    }}>
                      {priceChange.change >= 0 ? '+' : ''}{priceChange.percentage.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Technical Analysis */}
            {technicalAnalysis && (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '15px',
                  color: '#495057'
                }}>
                  Technical Indicators
                  {getTrendIcon(technicalAnalysis.trend)}
                  <span style={{ 
                    fontSize: '12px',
                    color: technicalAnalysis.trend === 'BULLISH' ? '#28a745' : 
                           technicalAnalysis.trend === 'BEARISH' ? '#dc3545' : '#6c757d',
                    fontWeight: 'bold'
                  }}>
                    {technicalAnalysis.trend}
                  </span>
                </h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>SMA (20):</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      {technicalAnalysis.sma_20?.toFixed(5) || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>RSI:</span>
                    <span style={{ 
                      fontFamily: 'monospace',
                      color: technicalAnalysis.rsi 
                        ? technicalAnalysis.rsi > 70 ? '#dc3545' 
                          : technicalAnalysis.rsi < 30 ? '#28a745' 
                          : '#333'
                        : '#333'
                    }}>
                      {technicalAnalysis.rsi?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>MACD:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                      {technicalAnalysis.macd?.toFixed(6) || 'N/A'}
                    </span>
                  </div>
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <strong>Data Source:</strong> {technicalAnalysis.data_source}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Chart */}
          {priceHistory.length > 0 && (
            <div>
              <h4 style={{ 
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <BarChart3 className="w-4 h-4" />
                Price Chart - {selectedPair}
                <span style={{ 
                  fontSize: '12px', 
                  color: '#6c757d',
                  marginLeft: 'auto'
                }}>
                  Last {priceHistory.length} data points
                </span>
              </h4>
              <div style={{ 
                height: '400px', 
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      fontSize={12}
                      stroke="#6c757d"
                    />
                    <YAxis 
                      domain={['dataMin - 0.001', 'dataMax + 0.001']}
                      tickFormatter={(value) => value.toFixed(5)}
                      fontSize={12}
                      stroke="#6c757d"
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [formatPrice(value), 'Mid Price']}
                      contentStyle={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#007bff" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: '#007bff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForexDashboard;