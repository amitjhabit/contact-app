// app/api/contacts/route.js
import { NextResponse } from 'next/server';
import { getDb, ensureInit } from '@/lib/db';

/* ── POST /api/contacts — public: submit contact form ── */
export async function POST(request) {
  try {
    await ensureInit();
    const sql = getDb();
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Basic validation
    const errors = {};
    if (!name?.trim())    errors.name    = 'Name is required';
    if (!email?.trim())   errors.email   = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address';
    if (!message?.trim()) errors.message = 'Message is required';
    if (message?.trim().length < 10) errors.message = 'Message must be at least 10 characters';

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Get IP for spam tracking
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const [contact] = await sql`
      INSERT INTO contacts (name, email, subject, message, ip)
      VALUES (
        ${name.trim()},
        ${email.trim().toLowerCase()},
        ${subject?.trim() || 'General Inquiry'},
        ${message.trim()},
        ${ip}
      )
      RETURNING id, name, email, subject, created_at
    `;

    return NextResponse.json(
      { success: true, message: 'Message sent successfully!', data: contact },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/contacts:', err);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

/* ── GET /api/contacts — protected: dashboard fetches ── */
export async function GET(request) {
  try {
    // Auth check
    const auth = request.headers.get('x-dashboard-secret');
    if (auth !== process.env.DASHBOARD_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await ensureInit();
    const sql = getDb();

    const { searchParams } = new URL(request.url);
    const status  = searchParams.get('status');
    const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit   = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const offset  = (page - 1) * limit;

    let contacts, totalRow;

    if (status && status !== 'all') {
      contacts = await sql`
        SELECT * FROM contacts
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      [totalRow] = await sql`SELECT COUNT(*) AS total FROM contacts WHERE status = ${status}`;
    } else {
      contacts = await sql`
        SELECT * FROM contacts
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      [totalRow] = await sql`SELECT COUNT(*) AS total FROM contacts`;
    }

    // Status counts for dashboard stats
    const counts = await sql`
      SELECT status, COUNT(*) AS count
      FROM contacts
      GROUP BY status
    `;

    const stats = { new: 0, read: 0, replied: 0, archived: 0, total: 0 };
    counts.forEach(({ status, count }) => {
      stats[status] = parseInt(count);
      stats.total += parseInt(count);
    });

    return NextResponse.json({
      success: true,
      data: contacts,
      stats,
      pagination: {
        page,
        limit,
        total: parseInt(totalRow.total),
        pages: Math.ceil(totalRow.total / limit),
      },
    });
  } catch (err) {
    console.error('GET /api/contacts:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
