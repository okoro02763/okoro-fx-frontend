import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  getUsers,
  changeUserStatus,
  changeUserRole,
  getAuditLogs,
  getKyc,
  reviewKyc,
  getWithdrawals,
  reviewWithdrawal,
  type AdminUser,
  type AuditLog,
  type AdminKyc,
  type AdminWithdrawal,
} from '../api/admin';

type Status = AdminUser['status'];

type AdminTab = 'users' | 'kyc' | 'withdrawals';

const DOC_LABELS: Record<string, string> = {
  nin: 'NIN',
  national_id: 'National ID',
  voters_card: "Voter's Card",
  other: 'Other',
};

function mockKyc(): AdminKyc[] {
  return [
    { id: 1, userId: 2, name: 'Jane Doe', email: 'jane@example.com', docType: 'nin', docNumber: '12345678901', docImage: null, status: 'pending', reviewNote: '', submittedAt: '2026-08-28T10:00:00Z', reviewedAt: null },
    { id: 2, userId: 3, name: 'Bob Bee', email: 'bob@example.com', docType: 'national_id', docNumber: 'NG-99123456', docImage: null, status: 'pending', reviewNote: '', submittedAt: '2026-08-27T09:30:00Z', reviewedAt: null },
  ];
}

function mockWithdrawals(): AdminWithdrawal[] {
  return [
    { id: 1, userId: 2, name: 'Jane Doe', email: 'jane@example.com', amount: '5000.00', fee: '75.00', netAmount: '4925.00', bankName: 'Access Bank', accountNumber: '0123456789', accountName: 'Jane Doe', status: 'pending', reviewNote: '', createdAt: '2026-08-28T11:00:00Z', reviewedAt: null },
    { id: 2, userId: 3, name: 'Bob Bee', email: 'bob@example.com', amount: '10000.00', fee: '150.00', netAmount: '9850.00', bankName: 'GTBank', accountNumber: '0987654321', accountName: 'Bob Bee', status: 'approved', reviewNote: '', createdAt: '2026-08-26T08:00:00Z', reviewedAt: '2026-08-26T09:00:00Z' },
  ];
}

function mockUsers(): AdminUser[] {
  return [
    { id: 1, name: 'Jane Doe', email: 'jane@example.com', role: 'user', status: 'active', createdAt: '2026-07-01', tradeCount: 320, fraud: { score: 82, level: 'critical', reasons: ['Near-perfect win rate'] } },
    { id: 2, name: 'Bob Bee', email: 'bob@example.com', role: 'user', status: 'active', createdAt: '2026-07-12', tradeCount: 44, fraud: { score: 62, level: 'high', reasons: ['Extreme lot size'] } },
    { id: 3, name: 'Carol Chen', email: 'carol@example.com', role: 'user', status: 'active', createdAt: '2026-08-02', tradeCount: 0, fraud: { score: 34, level: 'medium', reasons: [] } },
    { id: 4, name: 'Dave Diaz', email: 'dave@example.com', role: 'admin', status: 'active', createdAt: '2026-06-01', tradeCount: 0, fraud: { score: 4, level: 'low', reasons: [] } },
  ];
}

const STATUS_COLORS: Record<Status, string> = {
  active: 'var(--profit)',
  suspended: 'var(--gold)',
  banned: 'var(--loss)',
};

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [kyc, setKyc] = useState<AdminKyc[]>(mockKyc);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(
    mockWithdrawals
  );
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => {
    if (!token) return;
    getUsers(token)
      .then((data) => {
        if (data.length > 0) setUsers(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!token) return;
    loadUsers();
    getAuditLogs(token)
      .then((data) => setLogs(data))
      .catch(() => {});
    getKyc(token)
      .then((data) => {
        if (data.length > 0) setKyc(data);
      })
      .catch(() => {});
    getWithdrawals(token)
      .then((data) => {
        if (data.length > 0) setWithdrawals(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleStatus = async (u: AdminUser, status: Status) => {
    if (!token) return;
    setError(null);
    try {
      await changeUserStatus(token, u.id, status);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status } : x))
      );
      getAuditLogs(token).then((data) => setLogs(data)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleRole = async (u: AdminUser, role: AdminUser['role']) => {
    if (!token) return;
    setError(null);
    try {
      await changeUserRole(token, u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      getAuditLogs(token).then((data) => setLogs(data)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleKycReview = async (v: AdminKyc, status: 'approved' | 'rejected') => {
    if (!token) return;
    setError(null);
    try {
      const updated = await reviewKyc(token, v.id, status);
      setKyc((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
      getAuditLogs(token).then((data) => setLogs(data)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review document');
    }
  };

  const handleWithdrawReview = async (
    w: AdminWithdrawal,
    status: 'approved' | 'rejected' | 'paid'
  ) => {
    if (!token) return;
    setError(null);
    try {
      const updated = await reviewWithdrawal(token, w.id, status);
      setWithdrawals((prev) => prev.map((x) => (x.id === w.id ? updated : x)));
      getAuditLogs(token).then((data) => setLogs(data)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review withdrawal');
    }
  };

  const counts = users.reduce(
    (acc, u) => {
      acc[u.status] += 1;
      return acc;
    },
    { active: 0, suspended: 0, banned: 0 } as Record<Status, number>
  );

  return (
    <DashboardLayout title="Admin Dashboard">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Total Users" value={users.length} />
        <StatCard label="Active" value={counts.active} />
        <StatCard label="Suspended" value={counts.suspended} />
        <StatCard label="Banned" value={counts.banned} />
      </div>

      {error && (
        <div
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: 'var(--loss)',
            padding: '12px 16px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--loss)',
            borderRadius: 'var(--radius-input)',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['users', 'kyc', 'withdrawals'] as AdminTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'capitalize',
              padding: '10px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: tab === t ? 'var(--panel2)' : 'var(--panel)',
              color: tab === t ? 'var(--text)' : 'var(--sub)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {t === 'kyc' ? 'Verifications' : t}
          </button>
        ))}
      </div>

      {tab === 'users' && (
      <Card title="User Management">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead>
              <tr>
                {['User', 'Role', 'Status', 'Risk', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontFamily: 'Inter',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--faint)',
                      padding: '10px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ display: 'block', fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {u.name}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
                      {u.email}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRole(u, e.target.value as AdminUser['role'])}
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '12px',
                        padding: '6px 10px',
                        backgroundColor: 'var(--panel2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-input)',
                        color: 'var(--text)',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        color: STATUS_COLORS[u.status],
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: `${STATUS_COLORS[u.status]}22`,
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      data-mono
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: '14px',
                        fontWeight: 600,
                        color:
                          u.fraud.score >= 50 ? 'var(--loss)' : 'var(--text)',
                      }}
                    >
                      {u.fraud.score}
                      <span style={{ color: 'var(--faint)', fontWeight: 400 }}> /100</span>
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {u.status !== 'active' && (
                        <ActionBtn label="Activate" color="var(--profit)" onClick={() => handleStatus(u, 'active')} />
                      )}
                      {u.status !== 'suspended' && (
                        <ActionBtn label="Suspend" color="var(--gold)" onClick={() => handleStatus(u, 'suspended')} />
                      )}
                      {u.status !== 'banned' && (
                        <ActionBtn label="Ban" color="var(--loss)" onClick={() => handleStatus(u, 'banned')} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {tab === 'kyc' && (
        <Card title="Identity Verifications">
          {kyc.length === 0 ? (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--faint)' }}>
              No verification submissions yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                <thead>
                  <tr>
                    {['User', 'Document', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          fontFamily: 'Inter',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--faint)',
                          padding: '10px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kyc.map((v) => (
                    <tr key={v.id}>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ display: 'block', fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                          {v.name}
                        </span>
                        <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
                          {v.email}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text)' }}>
                          {DOC_LABELS[v.docType] || v.docType}
                        </span>
                        <span style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--sub)' }}>
                          {v.docNumber}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--faint)' }}>
                        {new Date(v.submittedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            fontFamily: 'Inter',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            color: v.status === 'approved' ? 'var(--profit)' : v.status === 'rejected' ? 'var(--loss)' : 'var(--gold)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--panel2)',
                          }}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {v.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <ActionBtn label="Approve" color="var(--profit)" onClick={() => handleKycReview(v, 'approved')} />
                            <ActionBtn label="Reject" color="var(--loss)" onClick={() => handleKycReview(v, 'rejected')} />
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--faint)' }}>
                            {v.reviewNote || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card title="Withdrawal Requests">
          {withdrawals.length === 0 ? (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--faint)' }}>
              No withdrawal requests yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                <thead>
                  <tr>
                    {['User', 'Amount', 'Fee', 'Net', 'Bank', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          fontFamily: 'Inter',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--faint)',
                          padding: '10px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ display: 'block', fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                          {w.name}
                        </span>
                        <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
                          {w.email}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text)' }}>
                        N{Number(w.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--loss)' }}>
                        -N{Number(w.fee).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--profit)' }}>
                        N{Number(w.netAmount).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ display: 'block', fontFamily: 'Inter', fontSize: '12px', color: 'var(--text)' }}>
                          {w.bankName}
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--sub)' }}>
                          {w.accountNumber} · {w.accountName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            fontFamily: 'Inter',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            color: w.status === 'paid' || w.status === 'approved' ? 'var(--profit)' : w.status === 'rejected' ? 'var(--loss)' : 'var(--gold)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--panel2)',
                          }}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {w.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <ActionBtn label="Approve" color="var(--profit)" onClick={() => handleWithdrawReview(w, 'approved')} />
                            <ActionBtn label="Reject" color="var(--loss)" onClick={() => handleWithdrawReview(w, 'rejected')} />
                          </div>
                        ) : w.status === 'approved' ? (
                          <ActionBtn label="Mark paid" color="var(--gold)" onClick={() => handleWithdrawReview(w, 'paid')} />
                        ) : (
                          <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--faint)' }}>
                            {w.reviewNote || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <div style={{ marginTop: '20px' }}>
        <Card title="Audit Log">
          {logs.length === 0 ? (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--faint)' }}>
              No audit entries yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Time', 'Actor', 'Action', 'Target'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontFamily: 'Inter',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--faint)',
                        padding: '10px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: '10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--faint)' }}>
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'Inter', fontSize: '13px', color: 'var(--text)' }}>{l.actor}</td>
                    <td style={{ padding: '10px', fontFamily: 'Inter', fontSize: '13px', color: 'var(--gold)' }}>{l.action}</td>
                    <td style={{ padding: '10px', fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>{l.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ActionBtn({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'Inter',
        fontSize: '11px',
        fontWeight: 600,
        color,
        backgroundColor: 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 'var(--radius-input)',
        padding: '5px 10px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
