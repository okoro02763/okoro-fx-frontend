import React, { useEffect, useState } from 'react';
import { getDevices, revokeDevice, passkeyRegisterBegin, passkeyRegisterFinish } from '../api/auth';
import { isWebAuthnSupported, registerPasskey } from '../lib/webauthn';

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passkeyMsg, setPasskeyMsg] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getDevices();
      setDevices(res.devices || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const registerPasskeyNow = async () => {
    if (!isWebAuthnSupported()) {
      setPasskeyMsg('Passkeys are not supported on this browser/device.');
      return;
    }
    setError('');
    setPasskeyMsg('');
    setPasskeyLoading(true);
    try {
      const options = await passkeyRegisterBegin();
      const credential = await registerPasskey(options);
      const res = await passkeyRegisterFinish(credential);
      setPasskeyMsg(res.message || 'Passkey registered successfully.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to register passkey.';
      setPasskeyMsg(msg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await revokeDevice(id);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to remove device');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', color: '#EDEEF5' }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', marginBottom: '16px' }}>Security</h1>
      <div
        style={{
          background: '#151829',
          border: '1px solid #272C47',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Passkeys / Biometrics</div>
            <div style={{ fontSize: '12px', color: '#868CA8', marginTop: '4px' }}>
              Sign in with fingerprint, Face ID, or Windows Hello
            </div>
          </div>
          <button
            onClick={registerPasskeyNow}
            disabled={passkeyLoading || !isWebAuthnSupported()}
            style={{
              background: '#E8B454',
              color: '#151829',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: passkeyLoading || !isWebAuthnSupported() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {passkeyLoading ? 'Registering...' : 'Add passkey'}
          </button>
        </div>
        {passkeyMsg && <p style={{ marginTop: '10px', fontSize: '12px', color: passkeyMsg.toLowerCase().includes('success') ? '#3FBFBF' : '#FF6B6B' }}>{passkeyMsg}</p>}
        {!isWebAuthnSupported() && <p style={{ marginTop: '10px', fontSize: '12px', color: '#868CA8' }}>Passkeys not supported in this browser.</p>}
      </div>
      <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '18px', marginBottom: '12px' }}>Trusted devices</h2>
      {error && <p style={{ color: '#FF6B6B', fontSize: '12px' }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#868CA8' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devices.map((d) => (
            <div
              key={d.id}
              style={{
                background: '#151829',
                border: '1px solid #272C47',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{d.label || 'Unknown device'}</div>
                <div style={{ fontSize: '12px', color: '#868CA8', marginTop: '4px' }}>
                  IP: {d.ip_address || 'Unknown'} · Last active: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '—'}
                </div>
              </div>
              <button
                onClick={() => remove(d.id)}
                style={{
                  background: '#FF6B6B',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {devices.length === 0 && <p style={{ color: '#868CA8' }}>No trusted devices.</p>}
        </div>
      )}
    </div>
  );
};

export default DevicesPage;
