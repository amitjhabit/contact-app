'use client';
// app/members/page.js — MembersMaster with Grid + Table toggle + Detail Panel

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ══════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════ */
const TYPE_META = {
  basic:  { label: 'Basic / Free',      bg: 'rgba(122,122,140,.15)', color: '#9a9ab0' },
  silver: { label: 'Silver / Standard', bg: 'rgba(192,192,192,.18)', color: '#c0c0d0' },
  gold:   { label: 'Gold / Premium',    bg: 'rgba(255,184,48,.15)',  color: '#ffb830' },
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
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function Avatar({ member, size }) {
  const s = size || 44;
  const tm = TYPE_META[member.membership_type] || TYPE_META.basic;
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: tm.bg, border: '2px solid ' + tm.color + '55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.3, fontWeight: 800, color: tm.color, fontFamily: 'var(--sans)', flexShrink: 0, overflow: 'hidden' }}>
      {member.photo_url
        ? <img src={member.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
        : (member.first_name[0] + member.last_name[0])}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type: type || 'success' }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => <div key={t.id} className={'toast toast-' + t.type}>{t.msg}</div>)}
    </div>
  );
}

/* ══════════════════════════════════════
   VIEW TOGGLE
══════════════════════════════════════ */
function ViewToggle({ view, onChange }) {
  const btns = [{ key: 'grid', icon: '⊞', label: 'Grid' }, { key: 'table', icon: '☰', label: 'Table' }];
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {btns.map((b) => (
        <button key={b.key} onClick={() => onChange(b.key)} style={{ fontFamily: 'var(--mono)', fontSize: '.78rem', fontWeight: 600, padding: '.35rem .9rem', cursor: 'pointer', border: 'none', background: view === b.key ? 'var(--accent)' : 'transparent', color: view === b.key ? '#0d0d0f' : 'var(--text-muted)', transition: '.15s', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          {b.icon} {b.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   ACTIVE TOGGLE SWITCH
══════════════════════════════════════ */
function ActiveSwitch({ active, onChange, showLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
      <div onClick={onChange} title="Toggle active" style={{ width: 40, height: 22, borderRadius: 11, background: active ? 'var(--accent)' : 'var(--bg-3)', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-hi)'), position: 'relative', cursor: 'pointer', transition: '.2s' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: active ? '#0d0d0f' : 'var(--text-dim)', position: 'absolute', top: 2, left: active ? 20 : 2, transition: '.2s' }} />
      </div>
      {showLabel && <span style={{ fontSize: '.58rem', color: active ? 'var(--accent)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{active ? 'On' : 'Off'}</span>}
    </div>
  );
}

/* ══════════════════════════════════════
   DETAIL SIDE PANEL
══════════════════════════════════════ */
function DetailPanel({ member, onClose, onEdit, onDelete }) {
  if (!member) return null;
  const tm = TYPE_META[member.membership_type] || TYPE_META.basic;
  const sm = STATUS_META[member.membership_status] || STATUS_META.inactive;
  const age = calcAge(member.date_of_birth);
  const expired = member.expiry_date && new Date(member.expiry_date) < new Date();

  function Row({ icon, label, value, danger }) {
    if (value == null || value === '') return null;
    return (
      <div style={{ display: 'flex', gap: '.75rem', padding: '.55rem 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '.9rem', flexShrink: 0, marginTop: '.05rem', width: 20, textAlign: 'center' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: '.1rem' }}>{label}</div>
          <div style={{ fontSize: '.875rem', color: danger ? 'var(--danger)' : 'var(--text)', lineHeight: 1.5 }}>{value}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }`}</style>
      {/* Backdrop for mobile */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 79 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, background: 'var(--bg-2)', borderLeft: '1px solid var(--border-hi)', zIndex: 80, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.5)', animation: 'slideInRight .22s ease' }}>

        {/* Panel header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)' }}>Member Detail</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} style={{ fontSize: '1rem' }}>✕</button>
        </div>

        {/* Avatar + name + badges */}
        <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.85rem' }}>
            <Avatar member={member} size={72} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '.5rem' }}>{member.first_name} {member.last_name}</div>
          <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
            <span className={'badge ' + sm.cls}>{sm.label}</span>
            <span className="badge" style={{ background: member.is_member_active ? 'rgba(0,229,160,.12)' : 'rgba(255,77,109,.1)', color: member.is_member_active ? 'var(--accent)' : 'var(--danger)' }}>
              {member.is_member_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem' }}>
          <Row icon="✉"  label="Email"         value={member.email} />
          <Row icon="☎"  label="Phone"         value={member.phone} />
          <Row icon="🎂" label="Date of Birth"  value={member.date_of_birth ? (fmtDate(member.date_of_birth) + (age ? ' (Age ' + age + ')' : '')) : null} />
          <Row icon="⚧"  label="Gender"        value={member.gender ? member.gender.replace(/_/g, ' ') : null} />
          <Row icon="📍" label="Address"        value={[member.address, member.city, member.state, member.zip].filter(Boolean).join(', ')} />
          <Row icon="📅" label="Joined"         value={fmtDate(member.joined_date)} />
          <Row icon="⏳" label="Expiry Date"    value={member.expiry_date ? fmtDate(member.expiry_date) : null} danger={expired} />
          {expired && (
            <div style={{ background: 'rgba(255,77,109,.08)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 'var(--radius)', padding: '.6rem .85rem', margin: '.75rem 0', color: 'var(--danger)', fontSize: '.8rem' }}>
              ⚠️ Expired on {fmtDate(member.expiry_date)}
            </div>
          )}
          <Row icon="📝" label="Notes"          value={member.notes} />
          <Row icon="🪪" label="Member ID"      value={'#' + member.id} />
          <Row icon="🕐" label="Registered"     value={new Date(member.created_at).toLocaleString()} />
        </div>

        {/* Action buttons */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
          <button className="btn btn-danger btn-sm" style={{ justifyContent: 'center' }} onClick={() => { onDelete(member.id); onClose(); }}>🗑 Delete</button>
          <button className="btn btn-primary btn-sm" style={{ justifyContent: 'center' }} onClick={() => { onEdit(member); onClose(); }}>✏️ Edit</button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════ */
function MemberModal({ member, secret, onClose, onSave }) {
  const isEdit = !!member;
  const today  = new Date().toISOString().split('T')[0];
  const blank  = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', photo_url: '', address: '', city: '', state: '', zip: '', membership_type: 'basic', membership_status: 'active', is_member_active: true, joined_date: today, expiry_date: '', notes: '' };

  function normalize(m) {
    return Object.assign({}, blank, m, {
      date_of_birth: m.date_of_birth ? m.date_of_birth.split('T')[0] : '',
      joined_date:   m.joined_date   ? m.joined_date.split('T')[0]   : today,
      expiry_date:   m.expiry_date   ? m.expiry_date.split('T')[0]   : '',
    });
  }

  const [form, setForm]     = useState(isEdit ? normalize(member) : blank);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set  = (k) => (e) => setForm((p) => Object.assign({}, p, { [k]: e.target.value }));
  const setB = (k, v) => setForm((p) => Object.assign({}, p, { [k]: v }));

  const submit = async () => {
    setErrors({});
    setLoading(true);
    try {
      const payload = Object.assign({}, form, { date_of_birth: form.date_of_birth || null, expiry_date: form.expiry_date || null, photo_url: form.photo_url || null });
      const res  = await fetch(isEdit ? '/api/members/' + member.id : '/api/members', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-secret': secret },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success)     { onSave(data.data, isEdit); onClose(); }
      else if (data.errors) setErrors(data.errors);
      else                  setErrors({ _: data.message || 'Something went wrong' });
    } catch (e) { setErrors({ _: 'Network error' }); }
    setLoading(false);
  };

  const SH = (t) => <p style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', margin: '.75rem 0 .6rem' }}>{t}</p>;
  const HR = () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />;

  function F({ label, k, type, span2, opts, req }) {
    return (
      <div className={span2 ? 'form-group span-2' : 'form-group'}>
        <label>{label}{req && <span className="req"> *</span>}</label>
        {opts ? (
          <select value={form[k] || ''} onChange={set(k)}>
            {opts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
          </select>
        ) : (
          <input type={type || 'text'} value={form[k] || ''} onChange={set(k)} className={errors[k] ? 'error' : ''} />
        )}
        {errors[k] && <span className="field-error">{errors[k]}</span>}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit — ' + member.first_name + ' ' + member.last_name : '👤 Add New Member'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {errors._ && <div style={{ background: 'rgba(255,77,109,.1)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 'var(--radius)', padding: '.7rem 1rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '.82rem' }}>{errors._}</div>}

        {SH('Personal Information')}
        <div className="form-grid">
          <F label="First Name" k="first_name" req />
          <F label="Last Name"  k="last_name"  req />
          <F label="Email"      k="email" type="email" req />
          <F label="Phone"      k="phone" type="tel" />
          <F label="Date of Birth" k="date_of_birth" type="date" />
          <F label="Gender" k="gender" opts={[['','Select…'],['male','Male'],['female','Female'],['other','Other'],['prefer_not_to_say','Prefer not to say']]} />
          <F label="Profile Photo URL" k="photo_url" type="url" span2 />
        </div>

        <HR />
        {SH('Address')}
        <div className="form-grid">
          <div className="form-group span-2"><label>Street Address</label><input value={form.address || ''} onChange={set('address')} /></div>
          <F label="City"  k="city" />
          <F label="State" k="state" />
          <F label="ZIP"   k="zip" />
        </div>

        <HR />
        {SH('Membership')}
        <div className="form-grid">
          <F label="Membership Type"   k="membership_type"   opts={[['basic','Basic / Free'],['silver','Silver / Standard'],['gold','Gold / Premium']]} />
          <F label="Membership Status" k="membership_status" opts={[['active','Active'],['inactive','Inactive'],['suspended','Suspended'],['expired','Expired']]} />
          <F label="Joined Date"  k="joined_date"  type="date" />
          <F label="Expiry Date"  k="expiry_date"  type="date" />
        </div>

        {/* Is Member Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', margin: '1rem 0', padding: '.85rem 1rem', background: 'var(--bg-3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div onClick={() => setB('is_member_active', !form.is_member_active)} style={{ width: 44, height: 24, borderRadius: 12, background: form.is_member_active ? 'var(--accent)' : 'var(--bg-3)', border: '1px solid ' + (form.is_member_active ? 'var(--accent)' : 'var(--border-hi)'), position: 'relative', cursor: 'pointer', transition: '.25s', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: form.is_member_active ? '#0d0d0f' : 'var(--text-dim)', position: 'absolute', top: 2, left: form.is_member_active ? 22 : 2, transition: '.25s' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Is Member Active</span>
          <span style={{ marginLeft: 'auto', fontSize: '.78rem', color: form.is_member_active ? 'var(--accent)' : 'var(--text-muted)' }}>{form.is_member_active ? '✓ Active' : '✗ Inactive'}</span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Notes / Remarks</label>
          <textarea value={form.notes || ''} onChange={set('notes')} rows={3} placeholder="Any additional notes…" />
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Save Changes' : 'Add Member')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   GRID VIEW COMPONENT
══════════════════════════════════════ */
function GridView({ members, onView, onEdit, onDelete, onToggleActive }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '1rem' }}>
      {members.map((m) => {
        const tm = TYPE_META[m.membership_type] || TYPE_META.basic;
        const sm = STATUS_META[m.membership_status] || STATUS_META.inactive;
        const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
        return (
          <div key={m.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.7rem', transition: 'border-color .18s, box-shadow .18s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', cursor: 'pointer', flex: 1 }} onClick={() => onView(m)}>
                <Avatar member={m} size={46} />
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>{m.first_name} {m.last_name}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{'#' + m.id + (calcAge(m.date_of_birth) ? ' · ' + calcAge(m.date_of_birth) + ' yrs' : '')}</div>
                </div>
              </div>
              <ActiveSwitch active={m.is_member_active} onChange={() => onToggleActive(m)} showLabel />
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.28rem', cursor: 'pointer' }} onClick={() => onView(m)}>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>✉ <span style={{ color: 'var(--text)' }}>{m.email}</span></div>
              {m.phone && <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>☎ {m.phone}</div>}
              {(m.city || m.state) && <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>📍 {[m.city, m.state, m.zip].filter(Boolean).join(', ')}</div>}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
              <span className={'badge ' + sm.cls}>{sm.label}</span>
              {expired && <span className="badge" style={{ background: 'rgba(255,77,109,.1)', color: 'var(--danger)' }}>⚠ Expired</span>}
            </div>

            {/* Dates */}
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
              <span>Joined: <b style={{ color: 'var(--text)' }}>{fmtDate(m.joined_date)}</b></span>
              {m.expiry_date && <span>Expires: <b style={{ color: expired ? 'var(--danger)' : 'var(--text)' }}>{fmtDate(m.expiry_date)}</b></span>}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem', borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
              <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center', fontSize: '.78rem' }} onClick={() => onView(m)}>👁 View</button>
              <button className="btn btn-primary btn-sm" style={{ justifyContent: 'center', fontSize: '.78rem' }} onClick={() => onEdit(m)}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm" style={{ justifyContent: 'center', fontSize: '.78rem' }} onClick={() => onDelete(m.id)}>🗑 Del</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════
   TABLE VIEW COMPONENT
══════════════════════════════════════ */
function TableView({ members, onView, onEdit, onDelete, onToggleActive }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Member</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Location</th>
            <th>Type</th>
            <th>Status</th>
            <th>Active</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const tm = TYPE_META[m.membership_type] || TYPE_META.basic;
            const sm = STATUS_META[m.membership_status] || STATUS_META.inactive;
            const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
            return (
              <tr key={m.id}>
                <td className="text-xs text-muted">{m.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer' }} onClick={() => onView(m)}>
                    <Avatar member={m} size={34} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', whiteSpace: 'nowrap' }}>{m.first_name} {m.last_name}</div>
                      {m.gender && <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{m.gender.replace(/_/g, ' ')}</div>}
                    </div>
                  </div>
                </td>
                <td className="text-sm" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</td>
                <td className="text-sm text-muted">{m.phone || '—'}</td>
                <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{[m.city, m.state].filter(Boolean).join(', ') || '—'}</td>
                <td><span className="badge" style={{ background: tm.bg, color: tm.color, whiteSpace: 'nowrap' }}>{tm.label}</span></td>
                <td>
                  <span className={'badge ' + sm.cls}>{sm.label}</span>
                  {expired && <div style={{ fontSize: '.62rem', color: 'var(--danger)', marginTop: '.2rem' }}>Expired</div>}
                </td>
                <td><ActiveSwitch active={m.is_member_active} onChange={() => onToggleActive(m)} /></td>
                <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.joined_date)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.3rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '.32rem .65rem', fontSize: '.8rem' }} onClick={() => onView(m)} title="View">👁</button>
                    <button className="btn btn-primary btn-sm" style={{ padding: '.32rem .65rem', fontSize: '.8rem' }} onClick={() => onEdit(m)} title="Edit">✏️</button>
                    <button className="btn btn-danger btn-sm" style={{ padding: '.32rem .65rem', fontSize: '.8rem' }} onClick={() => onDelete(m.id)} title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function MembersPage() {
  const { toasts, show } = useToast();

  const [secret, setSecret]           = useState('');
  const [authed, setAuthed]           = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState('');

  const [members, setMembers]         = useState([]);
  const [stats, setStats]             = useState({ total: 0, active_members: 0, basic: 0, silver: 0, gold: 0 });
  const [loading, setLoading]         = useState(false);
  const [pagination, setPagination]   = useState({ page: 1, pages: 1, total: 0 });

  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType]     = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  const [viewMode, setViewMode]       = useState('grid');
  const [showAdd, setShowAdd]         = useState(false);
  const [editMember, setEditMember]   = useState(null);
  const [panelMember, setPanelMember] = useState(null);

  const fetchMembers = useCallback(async (opts) => {
    const o = opts || {};
    setLoading(true);
    try {
      const activeVal = o.active !== undefined ? o.active : filterActive;
      const params = {
        page:   String(o.page || 1),
        limit:  '20',
        search: o.search !== undefined ? o.search : search,
        status: o.status !== undefined ? o.status : filterStatus,
        type:   o.type   !== undefined ? o.type   : filterType,
      };
      if (activeVal !== 'all') params.is_member_active = activeVal === 'true' ? 'true' : 'false';
      const qs  = new URLSearchParams(params);
      const res = await fetch('/api/members?' + qs, { headers: { 'x-dashboard-secret': secret } });
      const data = await res.json();
      if (data.success) { setMembers(data.data); setStats(data.stats); setPagination(data.pagination); }
      else show(data.message, 'error');
    } catch (e) { show('Network error', 'error'); }
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
    } catch (e) { setAuthError('Network error'); }
    setAuthLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this member permanently?')) return;
    try {
      const res  = await fetch('/api/members/' + id, { method: 'DELETE', headers: { 'x-dashboard-secret': secret } });
      const data = await res.json();
      if (data.success) { setMembers((p) => p.filter((m) => m.id !== id)); show('Member deleted'); fetchMembers(); }
      else show(data.message, 'error');
    } catch (e) { show('Delete failed', 'error'); }
  };

  const handleSave = (saved, isEdit) => {
    if (isEdit) setMembers((p) => p.map((m) => (m.id === saved.id ? saved : m)));
    else        setMembers((p) => [saved, ...p]);
    show(isEdit ? 'Member updated!' : 'Member added!');
    fetchMembers();
  };

  const handleToggleActive = async (member) => {
    try {
      const res  = await fetch('/api/members/' + member.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-dashboard-secret': secret }, body: JSON.stringify({ is_member_active: !member.is_member_active }) });
      const data = await res.json();
      if (data.success) {
        setMembers((p) => p.map((m) => m.id === member.id ? data.data : m));
        if (panelMember && panelMember.id === member.id) setPanelMember(data.data);
        show('Updated!');
      }
    } catch (e) { show('Failed', 'error'); }
  };

  /* ── Login screen ── */
  if (!authed) return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>👥</div>
        <h2>MembersMaster</h2>
        <p>Enter your admin password to manage members.</p>
        {authError && <div style={{ background: 'rgba(255,77,109,.1)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 'var(--radius)', padding: '.7rem .9rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '.8rem' }}>{authError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Password</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="DASHBOARD_SECRET" autoFocus />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={authLoading}>
            {authLoading ? <><span className="spinner" /> Verifying…</> : 'Enter Dashboard →'}
          </button>
        </form>
        <div className="mt-4 text-xs text-muted" style={{ textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--accent)' }}>← Contact Form</Link>
          {' · '}
          <Link href="/dashboard" style={{ color: 'var(--accent)' }}>Messages</Link>
        </div>
      </div>
    </div>
  );

  /* ── Main dashboard ── */
  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">Contact<span>Hub</span></a>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="nav-pill">Messages</Link>
          <span className="nav-pill" style={{ color: 'var(--accent)', borderColor: 'rgba(0,229,160,.4)' }}>Members</span>
          <button className="nav-pill" style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '.7rem', letterSpacing: '.08em', textTransform: 'uppercase', padding: '.25rem .7rem', borderRadius: '100px' }}
            onClick={() => { setAuthed(false); setSecret(''); setMembers([]); }}>Sign Out</button>
        </div>
      </nav>

      {/* Page shifts left when detail panel is open */}
      <div style={{ marginRight: panelMember ? 360 : 0, transition: 'margin-right .22s ease' }}>
        <div className="page-wide">

          {/* Stats */}
          <div className="stats-grid">
            {[
              { label: 'Total Members',  num: stats.total,          color: 'var(--text)'    },
              { label: 'Active Members', num: stats.active_members, color: 'var(--accent)'  },
              { label: 'Gold / Premium', num: stats.gold,           color: 'var(--warning)' },
              { label: 'Silver',         num: stats.silver,         color: '#c0c0d0'        },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="section-header">
            <h2>👥 MembersMaster</h2>
            <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
              <ViewToggle view={viewMode} onChange={setViewMode} />
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Member</button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍  Search name, email, phone, city…" style={{ flex: '1 1 220px', maxWidth: 300 }} />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); fetchMembers({ status: e.target.value }); }} style={{ width: 'auto' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); fetchMembers({ type: e.target.value }); }} style={{ width: 'auto' }}>
              <option value="all">All Types</option>
              <option value="basic">Basic / Free</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
            <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); fetchMembers({ active: e.target.value }); }} style={{ width: 'auto' }}>
              <option value="all">All Members</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchMembers()}>↻ Refresh</button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading"><span className="spinner" /> Loading members…</div>
          ) : members.length === 0 ? (
            <div className="empty">
              <div className="icon">👤</div>
              <p>No members found.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setShowAdd(true)}>+ Add First Member</button>
            </div>
          ) : (
            <>
              {viewMode === 'grid'
                ? <GridView  members={members} onView={setPanelMember} onEdit={(m) => { setPanelMember(null); setEditMember(m); }} onDelete={handleDelete} onToggleActive={handleToggleActive} />
                : <TableView members={members} onView={setPanelMember} onEdit={(m) => { setPanelMember(null); setEditMember(m); }} onDelete={handleDelete} onToggleActive={handleToggleActive} />
              }
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

          <div className="mt-8" style={{ textAlign: 'center' }}>
            <p className="text-xs text-muted">MembersMaster · Neon PostgreSQL · <code style={{ color: 'var(--accent)' }}>/api/members</code></p>
          </div>
        </div>
      </div>

      {/* Detail side panel */}
      {panelMember && (
        <DetailPanel
          member={panelMember}
          onClose={() => setPanelMember(null)}
          onEdit={(m) => { setPanelMember(null); setEditMember(m); }}
          onDelete={(id) => { handleDelete(id); setPanelMember(null); }}
        />
      )}

      {showAdd    && <MemberModal member={null}       secret={secret} onClose={() => setShowAdd(false)}   onSave={handleSave} />}
      {editMember && <MemberModal member={editMember} secret={secret} onClose={() => setEditMember(null)} onSave={handleSave} />}

      <Toast toasts={toasts} />
    </>
  );
}
