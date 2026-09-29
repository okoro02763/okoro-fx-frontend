import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, Users, DollarSign } from 'lucide-react';
import { apiService } from '../../Services/api';
import type { DerivStatus, AccountInfo } from '../../types';

const DerivStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<DerivStatus | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [statusData, accountData] = await Promise.all([
          apiService.getDerivStatus(),
          apiService.getAccountInfo()
        ]);
        setStatus(statusData);
        setAccountInfo(accountData);
      } catch (error) {
        console.error('Failed to fetch Deriv status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Loading Deriv status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px' 
      }}>
        <Server className="w-5 h-5" />
        Deriv API Status
      </h3>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '20px' 
      }}>
        {/* Connection Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '15px',
          backgroundColor: status?.connected ? '#d4edda' : '#f8d7da',
          borderRadius: '8px',
          border: `1px solid ${status?.connected ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {status?.connected ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {status?.connected ? 'Connected' : 'Disconnected'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              WebSocket Status
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {status?.subscriptions || 0}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Active Subscriptions
            </div>
          </div>
        </div>

        {/* Account Balance */}
        {accountInfo?.accounts && accountInfo.accounts.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            border: '1px solid #ffeaa7'
          }}>
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                ${accountInfo.accounts[0].balance.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                {accountInfo.accounts[0].currency} Balance
                {accountInfo.accounts[0].is_demo && ' (Demo)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supported Pairs */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
          Supported Currency Pairs ({status?.supported_pairs?.length || 0})
        </h4>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px'
        }}>
          {status?.supported_pairs?.slice(0, 8).map((pair, index) => (
            <span 
              key={index}
              style={{
                padding: '4px 8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {pair}
            </span>
          ))}
          {(status?.supported_pairs?.length || 0) > 8 && (
            <span style={{ fontSize: '12px', opacity: 0.6 }}>
              +{(status?.supported_pairs?.length || 0) - 8} more
            </span>
          )}
        </div>
      </div>

      {/* API URL */}
      {status?.api_url && (
        <div style={{ 
          fontSize: '12px', 
          color: '#6c757d',
          fontFamily: 'monospace',
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
          wordBreak: 'break-all'
        }}>
          <strong>API URL:</strong> {status.api_url}
        </div>
      )}

      {/* Account Details */}
      {accountInfo?.accounts && accountInfo.accounts.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
            Account Details
          </h4>
          {accountInfo.accounts.map((account, index) => (
            <div key={index} style={{ 
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '5px'
            }}>
              <div><strong>ID:</strong> {account.account_id}</div>
              <div><strong>Currency:</strong> {account.currency}</div>
              <div><strong>Type:</strong> {account.is_demo ? 'Demo' : 'Real'}</div>
              <div><strong>Last Updated:</strong> {new Date(account.last_updated).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DerivStatusPanel;