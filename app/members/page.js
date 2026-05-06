'use client';
// app/members/page.js — MembersMaster Dashboard

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ── Helpers ───────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
    </div>
  );
}

const TYPE_META = {
  basic:  { label: 'Basic / Free',       bg: 'rgba(122,122,140,.15)', color: '#9a9ab0' },
  silver: { label: 'Silver / Standard',  bg: 'rgba(192,192,192,.18)', color: '#c0c0d0' },
  gold:   { label: 'Gold / Premium',     bg: 'rgba(255,184,48,.15)',  color: '#ffb830' },
};
const STATUS_META = {
  active:    { cls: 'badge-replied',  label: 'Active'    },
  inactive:  { cls: 'badge-read',     label: 'Inactive'  },
  suspended: { cls: 'badge-archived', label: 'Suspended' },
  expired:   { cls: 'badge-new',      label: 'Expired'   },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/* ── Field component ───────────────── */
function Field({ label, children, span2 }) {
  return (
    <div className={`form-group${span2 ? ' span-2' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

/* ══════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════ */
function MemberModal({ member, secret, onClose, onSave }) {
  const isEdit = !!member;
  const today  = new Date().toISOString().split('T')[0];

  const blank = {
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', gender: '',
    photo_url: '',
    address: '', city: '', state: '', zip: '',
    membership_type: 'basic', membership_status: 'active',
    is_member_active: true,
    joined_date: today, expiry_date: '',
    notes: '',
  };

  const normalize = (m) => ({
    ...blank, ...m,
    date_of_birth: m.date_of_birth ? m.date_of_birth.split('T')[0] : '',
    joined_date:   m.joined_date   ? m.joined_date.split('T')[0]   : today,
    expiry_date:   m.expiry_date   ? m.expiry_date.split('T')[0]   : '',
  });

  const [form, setForm]     = useState(isEdit ? normalize(member) : blank);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [k]: val }));
  };

  const submit = async () => {
    setErrors({});
    setLoading(true);
    try {
      const url    = isEdit ? `/api/members/${member.id}` : '/api/members';
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-dashboard-secret': secret },
        body: JSON.stringify({
          ...form,
          date_of_birth: form.date_of_birth || null,
          expiry_date:   form.expiry_date   || null,
          photo_url:     form.photo_url     || null,
        }),
      });
      const data = await res.json();
      if (data.success) { onSave(data.data, isEdit); onClose(); }
      else if (data.errors) setErrors(data.errors);
      else setErrors({ _global: data.message || 'Something went wrong' });
    } catch { setErrors({ _global: 'Network error. Try again.' }); }
    setLoading(false);
  };

  const SI = ({ style }) => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0', ...style }} />;
  const SH = ({ label }) => <p style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', marginBottom: '.65rem', marginTop: '.25rem' }}>{label}</p>;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h3>{isEdit ? `Edit — ${member.first_name} ${member.last_name}` : '👤 Add New Member'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {errors._global && (
          <div style={{ background:'rgba(255,77,109,.1)', border:'1px solid rgba(255,77,109,.3)', borderRadius:'var(--radius)', padding:'.7rem 1rem', marginBottom:'1rem', color:'var(--danger)', fontSize:'.82rem' }}>
            {errors._global}
          </div>
        )}

        {/* ── Personal Info ── */}
        <SH label="Personal Information" />
        <div className="form-grid">
          <Field label="First Name *">
            <input value={form.first_name} onChange={set('first_name')} className={errors.first_name ? 'error' : ''} placeholder="Jane" />
            {errors.first_name && <span className="field-error">{errors.first_name}</span>}
          </Field>
          <Field label="Last Name *">
            <input value={form.last_name} onChange={set('last_name')} className={errors.last_name ? 'error' : ''} placeholder="Smith" />
            {errors.last_name && <span className="field-error">{errors.last_name}</span>}
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={set('email')} className={errors.email ? 'error' : ''} placeholder="jane@example.com" />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="555-0100" />
          </Field>
          <Field label="Date of Birth">
            <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={set('gender')}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </Field>
          <Field label="Profile Photo URL" span2>
            <input type="url" value={form.photo_url} onChange={set('photo_url')} placeholder="https://example.com/photo.jpg" />
          </Field>
        </div>

        <SI />

        {/* ── Address ── */}
        <SH label="Address" />
        <div className="form-grid">
          <Field label="Street Address" span2>
            <input value={form.address} onChange={set('address')} placeholder="123 Main Street" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={set('city')} placeholder="New York" />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={set('state')} placeholder="NY" />
          </Field>
          <Field label="ZIP Code">
            <input value={form.zip} onChange={set('zip')} placeholder="10001" />
          </Field>
        </div>

        <SI />

        {/* ── Membership ── */}
        <SH label="Membership Details" />
        <div className="form-grid">
          <Field label="Membership Type">
            <select value={form.membership_type} onChange={set('membership_type')}>
              <option value="basic">Basic / Free</option>
              <option value="silver">Silver / Standard</option>
              <option value="gold">Gold / Premium</option>
            </select>
          </Field>
          <Field label="Membership Status">
            <select value={form.membership_status} onChange={set('membership_status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </Field>
          <Field label="Joined Date">
            <input type="date" value={form.joined_date} onChange={set('joined_date')} />
          </Field>
          <Field label="Expiry Date">
            <input type="date" value={form.expiry_date} onChange={set('expiry_date')} />
          </Field>
        </div>

        {/* Is Member Active toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:'.75rem', margin:'1rem 0', padding:'.85rem 1rem', background:'var(--bg-3)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'.6rem', cursor:'pointer', flex:1, textTransform:'none', letterSpacing:'normal', fontSize:'.9rem', color:'var(--text)' }}>
            <div
              onClick={() => setForm((p) => ({ ...p, is_member_active: !p.is_member_active }))}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.is_member_active ? 'var(--accent)' : 'var(--bg-3)',
                border: '1px solid ' + (form.is_member_active ? 'var(--accent)' : 'var(--border-hi)'),
                position: 'relative', cursor: 'pointer', transition: '.25s', flexShrink: 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: form.is_member_active ? '#0d0d0f' : 'var(--text-dim)',
                position: 'absolute', top: 2,
                left: form.is_member_active ? 22 : 2,
                transition: '.25s',
              }} />
            </div>
            <span style={{ fontWeight: 600 }}>Is Member Active</span>
          </label>
          <span style={{ fontSize:'.78rem', color: form.is_member_active ? 'var(--accent)' : 'var(--text-muted)' }}>
            {form.is_member_active ? '✓ Active' : '✗ Inactive'}
          </span>
        </div>

        <SI />

        {/* Notes */}
        <Field label="Notes / Remarks">
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Any additional notes about this member…" />
        </Field>

        <div className="flex gap-2" style={{ justifyContent:'flex-end', marginTop:'1rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Save Changes' : 'Add Member')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   DETAIL MODAL
══════════════════════════════════ */
function MemberDetail({ member, secret, onClose, onEdit, onDelete }) {
  const tm = TYPE_META[member.membership_type] || TYPE_META.basic;
  const sm = STATUS_META[member.membership_status] || STATUS_META.inactive;
  const age = calcAge(member.date_of_birth);
  const isExpired = member.expiry_date && new Date(member.expiry_date) < new Date();

  const Row = ({ label, value, danger }) => value != null && value !== '' && value !== false ? (
    <div style={{ display:'flex', gap:'1rem', padding:'.5rem 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ width:150, fontSize:'.7rem', textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)', flexShrink:0, paddingTop:'.1rem' }}>{label}</span>
      <span style={{ fontSize:'.875rem', color: danger ? 'var(--danger)' : 'var(--text)' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div style={{ width:52, height:52, borderRadius:'50%', background:tm.bg, border:`1px solid ${tm.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:800, color:tm.color, fontFamily:'var(--sans)', flexShrink:0, overflow:'hidden' }}>
              {member.photo_url
                ? <img src={member.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                : `${member.first_name[0]}${member.last_name[0]}`}
            </div>
            <div>
              <div style={{ fontFamily:'var(--sans)', fontSize:'1.15rem', fontWeight:700 }}>{member.first_name} {member.last_name}</div>
              <div className="flex gap-2 mt-1" style={{ flexWrap:'wrap' }}>
                <span className={`badge ${sm.cls}`}>{sm.label}</span>
                <span className="badge" style={{ background:tm.bg, color:tm.color }}>{tm.label}</span>
                <span className="badge" style={{ background: member.is_member_active ? 'rgba(0,229,160,.12)' : 'rgba(255,77,109,.1)', color: member.is_member_active ? 'var(--accent)' : 'var(--danger)' }}>
                  {member.is_member_active ? '● Active Member' : '○ Not Active'}
                </span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ marginBottom:'1.5rem' }}>
          <Row label="Email"        value={member.email} />
          <Row label="Phone"        value={member.phone} />
          <Row label="Date of Birth" value={member.date_of_birth ? `${fmtDate(member.date_of_birth)}${age ? ` (Age ${age})` : ''}` : null} />
          <Row label="Gender"       value={member.gender ? member.gender.replace(/_/g,' ') : null} />
          <Row label="Address"      value={[member.address, member.city, member.state, member.zip].filter(Boolean).join(', ')} />
          <Row label="Joined Date"  value={fmtDate(member.joined_date)} />
          <Row label="Expiry Date"  value={member.expiry_date ? fmtDate(member.expiry_date) : null} danger={isExpired} />
          <Row label="Notes"        value={member.notes} />
          <Row label="Member ID"    value={`#${member.id}`} />
          <Row label="Registered"   value={new Date(member.created_at).toLocaleString()} />
        </div>

        {isExpired && (
          <div style={{ background:'rgba(255,77,109,.08)', border:'1px solid rgba(255,77,109,.2)', borderRadius:'var(--radius)', padding:'.65rem 1rem', marginBottom:'1rem', color:'var(--danger)', fontSize:'.8rem' }}>
            ⚠️ Membership expired on {fmtDate(member.expiry_date)}
          </div>
        )}

        <div className="flex gap-2" style={{ justifyContent:'flex-end' }}>
          <button className="btn btn-danger btn-sm" onClick={() => { onDelete(member.id); onClose(); }}>Delete</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-sm" onClick={() => { onEdit(member); onClose(); }}>Edit →</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN MEMBERS PAGE
══════════════════════════════════ */
export default function MembersPage() {
  const { toasts, show } = useToast();

  // Auth
  const [secret, setSecret]     = useState('');
  const [authed, setAuthed]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState('');

  // Data
  const [members, setMembers]   = useState([]);
  const [stats, setStats]       = useState({ total:0, active_members:0, inactive_members:0, basic:0, silver:0, gold:0 });
  const [loading, setLoading]   = useState(false);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });

  // Filters
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType]     = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  // Modals
  const [showAdd, setShowAdd]       = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [viewMember, setViewMember] = useState(null);

  const fetchMembers = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page:   opts.page   ?? 1,
        limit:  20,
        search: opts.search ?? search,
        status: opts.status ?? filterStatus,
        type:   opts.type   ?? filterType,
        ...(((opts.active ?? filterActive) !== 'all') && { is_member_active: (opts.active ?? filterActive) === 'true' }),
      });
      const res  = await fetch(`/api/members?${qs}`, { headers: { 'x-dashboard-secret': secret } });
      const data = await res.json();
      if (data.success) { setMembers(data.data); setStats(data.stats); setPagination(data.pagination); }
      else show(data.message, 'error');
    } catch { show('Network error', 'error'); }
    setLoading(false);
  }, [secret, search, filterStatus, filterType, filterActive, show]);

  useEffect(() => { if (authed) fetchMembers(); }, [authed, fetchMembers]);

  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(() => fetchMembers({ search }), 380);
    return () => clearTimeout(t);
  }, [search, authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch('/api/members?limit=1', { headers: { 'x-dashboard-secret': secret } });
      if (res.ok) setAuthed(true);
      else setAuthError('Invalid password. Check DASHBOARD_SECRET in .env.local');
    } catch { setAuthError('Network error'); }
    setAuthLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this member permanently?')) return;
    try {
      const res  = await fetch(`/api/members/${id}`, { method:'DELETE', headers:{ 'x-dashboard-secret': secret } });
      const data = await res.json();
      if (data.success) { setMembers((p) => p.filter((m) => m.id !== id)); show('Member deleted'); fetchMembers(); }
      else show(data.message, 'error');
    } catch { show('Delete failed', 'error'); }
  };

  const handleSave = (saved, isEdit) => {
    if (isEdit) setMembers((p) => p.map((m) => (m.id === saved.id ? saved : m)));
    else setMembers((p) => [saved, ...p]);
    show(isEdit ? 'Member updated!' : 'Member added!');
    fetchMembers();
  };

  const toggleActive = async (member) => {
    try {
      const res  = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', 'x-dashboard-secret': secret },
        body: JSON.stringify({ is_member_active: !member.is_member_active }),
      });
      const data = await res.json();
      if (data.success) { setMembers((p) => p.map((m) => m.id === member.id ? data.data : m)); show('Updated!'); }
    } catch { show('Failed to update', 'error'); }
  };

  /* ── Login Screen ── */
  if (!authed) return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>👥</div>
        <h2>MembersMaster</h2>
        <p>Enter your admin password to manage members.</p>
        {authError && <div style={{ background:'rgba(255,77,109,.1)', border:'1px solid rgba(255,77,109,.3)', borderRadius:'var(--radius)', padding:'.7rem .9rem', marginBottom:'1rem', color:'var(--danger)', fontSize:'.8rem' }}>{authError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom:'1rem' }}>
            <label>Password</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="DASHBOARD_SECRET" autoFocus />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={authLoading}>
            {authLoading ? <><span className="spinner" /> Verifying…</> : 'Enter Dashboard →'}
          </button>
        </form>
        <div className="mt-4 text-xs text-muted" style={{ textAlign:'center' }}>
          <Link href="/" style={{ color:'var(--accent)' }}>← Contact Form</Link>
          {' · '}
          <Link href="/dashboard" style={{ color:'var(--accent)' }}>Messages Dashboard</Link>
        </div>
      </div>
    </div>
  );

  /* ── Main Dashboard ── */
  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">Contact<span>Hub</span></a>
        <div style={{ display:'flex', gap:'.75rem', alignItems:'center' }}>
          <Link href="/dashboard" className="nav-pill">Messages</Link>
          <span className="nav-pill" style={{ color:'var(--accent)', borderColor:'rgba(0,229,160,.4)' }}>Members</span>
          <button className="nav-pill" style={{ cursor:'pointer', background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:'.7rem', letterSpacing:'.08em', textTransform:'uppercase', padding:'.25rem .7rem', borderRadius:'100px' }}
            onClick={() => { setAuthed(false); setSecret(''); setMembers([]); }}>Sign Out</button>
        </div>
      </nav>

      <div className="page-wide">

        {/* Stats row */}
        <div className="stats-grid">
          {[
            { label:'Total Members',   num: stats.total,            color:'var(--text)' },
            { label:'Active Members',  num: stats.active_members,   color:'var(--accent)' },
            { label:'Gold / Premium',  num: stats.gold,             color:'var(--warning)' },
            { label:'Silver',          num: stats.silver,           color:'#c0c0d0' },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num" style={{ color:s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="section-header">
          <h2>👥 MembersMaster</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Member</button>
        </div>

        {/* Search + Filters */}
        <div style={{ display:'flex', gap:'.65rem', flexWrap:'wrap', marginBottom:'1.25rem', alignItems:'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search name, email, phone, city…"
            style={{ flex:'1 1 220px', maxWidth:300 }}
          />
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchMembers({ status:e.target.value }); }} style={{ width:'auto' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); fetchMembers({ type:e.target.value }); }} style={{ width:'auto' }}>
            <option value="all">All Types</option>
            <option value="basic">Basic / Free</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
          <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); fetchMembers({ active:e.target.value }); }} style={{ width:'auto' }}>
            <option value="all">All Members</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchMembers()}>↻ Refresh</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading"><span className="spinner" /> Loading members…</div>
        ) : members.length === 0 ? (
          <div className="empty">
            <div className="icon">👤</div>
            <p>No members found.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop:'1rem' }} onClick={() => setShowAdd(true)}>+ Add First Member</button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>DOB / Age</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Is Active</th>
                    <th>Joined</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const tm = TYPE_META[m.membership_type] || TYPE_META.basic;
                    const sm = STATUS_META[m.membership_status] || STATUS_META.inactive;
                    const age = calcAge(m.date_of_birth);
                    const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
                    return (
                      <tr key={m.id}>
                        <td className="text-xs text-muted">{m.id}</td>

                        {/* Name + photo */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div style={{ width:34, height:34, borderRadius:'50%', background:tm.bg, border:`1px solid ${tm.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.75rem', fontWeight:700, color:tm.color, flexShrink:0, overflow:'hidden' }}>
                              {m.photo_url
                                ? <img src={m.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e)=>{e.target.style.display='none';}} />
                                : `${m.first_name[0]}${m.last_name[0]}`}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:'.875rem', whiteSpace:'nowrap' }}>{m.first_name} {m.last_name}</div>
                              {m.gender && <div className="text-xs text-muted" style={{ textTransform:'capitalize' }}>{m.gender.replace(/_/g,' ')}</div>}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="text-sm truncate" style={{ maxWidth:180 }}>{m.email}</div>
                          {m.phone && <div className="text-xs text-muted">{m.phone}</div>}
                        </td>

                        <td className="text-sm text-muted" style={{ whiteSpace:'nowrap' }}>
                          {[m.city, m.state].filter(Boolean).join(', ') || '—'}
                          {m.zip && <div className="text-xs">{m.zip}</div>}
                        </td>

                        <td className="text-sm text-muted" style={{ whiteSpace:'nowrap' }}>
                          {m.date_of_birth ? fmtDate(m.date_of_birth) : '—'}
                          {age && <div className="text-xs">{age} yrs</div>}
                        </td>

                        <td>
                          <span className="badge" style={{ background:tm.bg, color:tm.color, whiteSpace:'nowrap' }}>
                            {tm.label}
                          </span>
                        </td>

                        <td><span className={`badge ${sm.cls}`}>{sm.label}</span></td>

                        {/* Is Member Active toggle */}
                        <td>
                          <div
                            onClick={() => toggleActive(m)}
                            title={`Click to ${m.is_member_active ? 'deactivate' : 'activate'}`}
                            style={{
                              width:40, height:22, borderRadius:11,
                              background: m.is_member_active ? 'var(--accent)' : 'var(--bg-3)',
                              border:'1px solid ' + (m.is_member_active ? 'var(--accent)' : 'var(--border-hi)'),
                              position:'relative', cursor:'pointer', transition:'.2s',
                            }}
                          >
                            <div style={{
                              width:16, height:16, borderRadius:'50%',
                              background: m.is_member_active ? '#0d0d0f' : 'var(--text-dim)',
                              position:'absolute', top:2,
                              left: m.is_member_active ? 20 : 2,
                              transition:'.2s',
                            }} />
                          </div>
                        </td>

                        <td className="text-xs text-muted" style={{ whiteSpace:'nowrap' }}>{fmtDate(m.joined_date)}</td>

                        <td className="text-xs" style={{ color: expired ? 'var(--danger)' : 'var(--text-muted)', whiteSpace:'nowrap' }}>
                          {m.expiry_date ? fmtDate(m.expiry_date) : '—'}
                          {expired && <div style={{ fontSize:'.65rem', color:'var(--danger)' }}>Expired</div>}
                        </td>

                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-ghost btn-sm" onClick={() => setViewMember(m)}>View</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditMember(m)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted">
                <span>Page {pagination.page} of {pagination.pages} ({pagination.total} members)</span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchMembers({ page: pagination.page - 1 })}>← Prev</button>
                  <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchMembers({ page: pagination.page + 1 })}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8" style={{ textAlign:'center' }}>
          <p className="text-xs text-muted">MembersMaster · Neon PostgreSQL · <code style={{ color:'var(--accent)' }}>/api/members</code></p>
        </div>
      </div>

      {showAdd    && <MemberModal member={null}       secret={secret} onClose={() => setShowAdd(false)}   onSave={handleSave} />}
      {editMember && <MemberModal member={editMember} secret={secret} onClose={() => setEditMember(null)} onSave={handleSave} />}
      {viewMember && <MemberDetail member={viewMember} secret={secret} onClose={() => setViewMember(null)} onEdit={setEditMember} onDelete={handleDelete} />}

      <Toast toasts={toasts} />
    </>
  );
}
