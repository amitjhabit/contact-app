// app/api/members/[id]/route.js
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function authCheck(request) {
  return request.headers.get('x-dashboard-secret') === process.env.DASHBOARD_SECRET;
}

/* ── GET /api/members/:id ── */
export async function GET(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    const [member] = await sql`SELECT * FROM members WHERE id = ${params.id}`;
    if (!member) return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: member });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── PATCH /api/members/:id ── */
export async function PATCH(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql  = getDb();
    const body = await request.json();

    const [existing] = await sql`SELECT * FROM members WHERE id = ${params.id}`;
    if (!existing) return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });

    const {
      first_name, last_name, email, phone,
      date_of_birth, gender, photo_url,
      address, city, state, zip,
      membership_type, membership_status, is_member_active,
      joined_date, expiry_date, notes,
    } = body;

    // Email uniqueness check if changing
    if (email && email.toLowerCase() !== existing.email) {
      const [dup] = await sql`
        SELECT id FROM members WHERE email = ${email.toLowerCase()} AND id != ${params.id}
      `;
      if (dup) return NextResponse.json({ success: false, errors: { email: 'Email already in use' } }, { status: 409 });
    }

    const [updated] = await sql`
      UPDATE members SET
        first_name        = ${first_name        ?? existing.first_name},
        last_name         = ${last_name         ?? existing.last_name},
        email             = ${email ? email.toLowerCase() : existing.email},
        phone             = ${phone             ?? existing.phone},
        date_of_birth     = ${date_of_birth     ?? existing.date_of_birth},
        gender            = ${gender            ?? existing.gender},
        photo_url         = ${photo_url         ?? existing.photo_url},
        address           = ${address           ?? existing.address},
        city              = ${city              ?? existing.city},
        state             = ${state             ?? existing.state},
        zip               = ${zip               ?? existing.zip},
        membership_type   = ${membership_type   ?? existing.membership_type},
        membership_status = ${membership_status ?? existing.membership_status},
        is_member_active  = ${is_member_active  !== undefined ? is_member_active : existing.is_member_active},
        joined_date       = ${joined_date       ?? existing.joined_date},
        expiry_date       = ${expiry_date       ?? existing.expiry_date},
        notes             = ${notes             ?? existing.notes}
      WHERE id = ${params.id}
      RETURNING *
    `;

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('PATCH /api/members:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/members/:id ── */
export async function DELETE(request, { params }) {
  if (!authCheck(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    const [deleted] = await sql`
      DELETE FROM members WHERE id = ${params.id} RETURNING id, first_name, last_name
    `;
    if (!deleted) return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: `${deleted.first_name} ${deleted.last_name} deleted` });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
