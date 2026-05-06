'use client';
// app/page.js — Public Contact Form

import { useState } from 'react';
import Link from 'next/link';

const SUBJECTS = [
  'General Inquiry',
  'Technical Support',
  'Billing Question',
  'Partnership / Collaboration',
  'Feature Request',
  'Bug Report',
  'Other',
];

export default function ContactPage() {
  const [form, setForm]       = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setLoading(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        setServerError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setServerError('Network error. Please check your connection.');
    }
    setLoading(false);
  };

  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">Contact<span>Hub</span></a>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <a href="/api/health" target="_blank" className="nav-pill">⚡ Health</a>
          <Link href="/dashboard" className="nav-pill">Dashboard →</Link>
        </div>
      </nav>

      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% -10%, rgba(0,229,160,.07) 0%, transparent 60%)',
        }}
      >
        <div className="page">

          {/* Hero */}
          <section className="hero" style={{ paddingTop: '3.5rem' }}>
            <span className="hero-eyebrow">Get in touch</span>
            <h1>We'd love to<br /><em>hear from you</em></h1>
            <p>Send us a message and we'll get back to you within 24 hours.</p>
          </section>

          {/* Form Card */}
          {submitted ? (
            <div className="card card-accent">
              <div className="success-wrap">
                <div className="success-icon">✓</div>
                <h2>Message Sent!</h2>
                <p style={{ marginBottom: '2rem' }}>
                  Thanks, <strong>{form.name}</strong>! We've received your message and will reply to <strong>{form.email}</strong> soon.
                </p>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: 'General Inquiry', message: '' }); }}
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              {serverError && (
                <div style={{ background: 'rgba(255,77,109,.1)', border: '1px solid rgba(255,77,109,.3)', borderRadius: 'var(--radius)', padding: '.85rem 1rem', marginBottom: '1.25rem', color: 'var(--danger)', fontSize: '.875rem' }}>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {/* Name */}
                  <div className="form-group">
                    <label>Name <span className="req">*</span></label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Jane Smith"
                      className={errors.name ? 'error' : ''}
                      autoComplete="name"
                    />
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label>Email <span className="req">*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="jane@example.com"
                      className={errors.email ? 'error' : ''}
                      autoComplete="email"
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  {/* Subject */}
                  <div className="form-group span-2">
                    <label>Subject</label>
                    <select value={form.subject} onChange={set('subject')}>
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="form-group span-2">
                    <label>Message <span className="req">*</span></label>
                    <textarea
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Tell us what's on your mind…"
                      className={errors.message ? 'error' : ''}
                      rows={6}
                    />
                    {errors.message && <span className="field-error">{errors.message}</span>}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ fontSize: '1rem', padding: '.8rem' }}>
                    {loading ? <><span className="spinner" /> Sending…</> : 'Send Message →'}
                  </button>
                </div>
              </form>

              <hr className="divider" />
              <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
                Your message is stored securely in Neon PostgreSQL. View submissions in the{' '}
                <Link href="/dashboard" style={{ color: 'var(--accent)' }}>admin dashboard</Link>.
              </p>
            </div>
          )}

          {/* Tech stack note */}
          <div className="mt-8" style={{ textAlign: 'center' }}>
            <p className="text-xs text-muted">
              Built with <span className="text-accent">Next.js 14</span> ·{' '}
              <span className="text-accent">Neon PostgreSQL</span> ·{' '}
              <span className="text-accent">Vercel</span>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
