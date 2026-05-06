'use client';
// app/dashboard/page.js — Protected Admin Dashboard

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ── Toast ────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

/* ── Message Detail Modal ──────────────── */
function MessageModal({ contact, secret, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-secret': secret },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) { onStatusChange(data.data); onClose(); }
    } catch {}
    setUpdating(false);
  };

  const STATUS_ACTIONS = [
    { label: 'Mark as Read',     value: 'read',     show: contact.status === 'new' },
    { label: 'Mark as Replied',  value: 'replied',  show: contact.status !== 'replied' },
    { label: 'Archive',          value: 'archived', show: contact.status !== 'archived' },
    { label: 'Mark as New',      value: 'new',      show: contact.status !== 'new' },
  ].filter((a) => a.show);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{contact.subject}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <p className="text-xs text-muted mb-2">FROM</p>
            <p style={{ fontSize: '.9rem', fontWeight: 600 }}>{contact.name}</p>
            <p className="text-sm text-muted">{contact.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-2">RECEIVED</p>
            <p className="text-sm">{new Date(contact.created_at).toLocaleString()}</p>
            <span className={`badge badge-${contact.status}`} style={{ marginTop: '.4rem' }}>{contact.status}</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
          <p className="text-xs text-muted mb-2">MESSAGE</p>
          <p style={{ fontSize: '.875rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{contact.message}</p>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {STATUS_ACTIONS.map((a) => (
            <button
              key={a.value}
              className="btn btn-ghost btn-sm"
              onClick={() => updateStatus(a.value)}
              disabled={updating}
            >
              {updating ? <span className="spinner" /> : a.label}
            </button>
          ))}
          <a
            href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            Reply via Email ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Login Screen ──────────────────────── */
function LoginScreen({ onLogin }) {
  const [secret, setSecret] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/contacts?limit=1', {
        headers: { 'x-dashboard-secret': secret },
      });
      if (res.ok) {
        onLogin(secret);
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ fontSize: '1.75rem', marginBottom: '.75rem' }}>🔒</div>
        <h2>Dashboard</h2>
        <p>Enter your admin password to view contact submissions.</p>
        {error && (
          <div style={{ background: 'rgba(255,77,109,.1)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 'var(--radius)', padding: '.7rem .9rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '.8rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Password</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter DASHBOARD_SECRET"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Verifying…</> : 'Enter Dashboard →'}
          </button>
        </form>
        <p className="text-xs text-muted mt-4" style={{ textAlign: 'center' }}>
          Set via <code style={{ color: 'var(--accent)' }}>DASHBOARD_SECRET</code> env var
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════ */
export default function Dashboard() {
  const { toasts, show } = useToast();

  const [secret, setSecret]     = useState('');
  const [authed, setAuthed]     = useState(false);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats]       = useState({ new: 0, read: 0, replied: 0, archived: 0, total: 0 });
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchContacts = useCallback(async (f = 'all', page = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page, limit: 20, ...(f !== 'all' && { status: f }) });
      const res = await fetch(`/api/contacts?${qs}`, { headers: { 'x-dashboard-secret': secret } });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      } else {
        show(data.message || 'Failed to load', 'error');
      }
    } catch { show('Network error', 'error'); }
    setLoading(false);
  }, [secret, show]);

  useEffect(() => {
    if (authed) fetchContacts(filter);
  }, [authed, filter, fetchContacts]);

  const handleLogin = (s) => { setSecret(s); setAuthed(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this message permanently?')) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'x-dashboard-secret': secret },
      });
      const data = await res.json();
      if (data.success) {
        setContacts((p) => p.filter((c) => c.id !== id));
        setStats((s) => ({ ...s, total: s.total - 1 }));
        show('Message deleted');
      }
    } catch { show('Delete failed', 'error'); }
  };

  const handleStatusChange = (updated) => {
    setContacts((p) => p.map((c) => (c.id === updated.id ? updated : c)));
    fetchContacts(filter);
    show('Status updated');
  };

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  const FILTERS = [
    { key: 'all',      label: `All (${stats.total})` },
    { key: 'new',      label: `New (${stats.new})` },
    { key: 'read',     label: `Read (${stats.read})` },
    { key: 'replied',  label: `Replied (${stats.replied})` },
    { key: 'archived', label: `Archived (${stats.archived})` },
  ];

  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">Contact<span>Hub</span></a>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="text-xs text-muted">Admin Dashboard</span>
          <button
            className="nav-pill"
            onClick={() => { setAuthed(false); setSecret(''); setContacts([]); }}
            style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '.7rem', letterSpacing: '.08em', textTransform: 'uppercase', padding: '.25rem .7rem', borderRadius: '100px', transition: '.18s' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-wide">

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total',    num: stats.total,    color: 'var(--text)' },
            { label: 'New',      num: stats.new,      color: 'var(--info)' },
            { label: 'Replied',  num: stats.replied,  color: 'var(--accent)' },
            { label: 'Archived', num: stats.archived, color: 'var(--warning)' },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Contacts table */}
        <div className="section-header">
          <h2>Messages</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchContacts(filter)}>↻ Refresh</button>
        </div>

        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><span className="spinner" /> Loading messages…</div>
        ) : contacts.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <p>No messages {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td className="text-muted text-xs">{c.id}</td>
                      <td style={{ fontWeight: c.status === 'new' ? 700 : 400 }}>{c.name}</td>
                      <td className="truncate text-muted text-sm">{c.email}</td>
                      <td className="truncate text-sm">{c.subject}</td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString()}{' '}
                        <span style={{ color: 'var(--text-dim)' }}>
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelected(c)}
                          >View</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(c.id)}
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted">
                <span>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchContacts(filter, pagination.page - 1)}
                  >← Prev</button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchContacts(filter, pagination.page + 1)}
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8" style={{ textAlign: 'center' }}>
          <p className="text-xs text-muted">
            Data stored in <span className="text-accent">Neon PostgreSQL</span> · API at{' '}
            <code style={{ color: 'var(--accent)' }}>/api/contacts</code>
          </p>
        </div>
      </div>

      {selected && (
        <MessageModal
          contact={selected}
          secret={secret}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      <Toast toasts={toasts} />
    </>
  );
}
