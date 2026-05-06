// app/api/contacts/[id]/route.js
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function authCheck(request) {
  return request.headers.get('x-dashboard-secret') === process.env.DASHBOARD_SECRET;
}

/* ── GET /api/contacts/:id ── */
export async function GET(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    const [contact] = await sql`SELECT * FROM contacts WHERE id = ${params.id}`;
    if (!contact) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: contact });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── PATCH /api/contacts/:id — update status ── */
export async function PATCH(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    const { status } = await request.json();
    const validStatuses = ['new', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }
    const [updated] = await sql`
      UPDATE contacts SET status = ${status}
      WHERE id = ${params.id}
      RETURNING *
    `;
    if (!updated) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/contacts/:id ── */
export async function DELETE(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    const [deleted] = await sql`DELETE FROM contacts WHERE id = ${params.id} RETURNING id`;
    if (!deleted) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
