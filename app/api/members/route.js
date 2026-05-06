// app/api/members/route.js
import { NextResponse } from 'next/server';
import { getDb, ensureInit } from '@/lib/db';

function authCheck(request) {
  return request.headers.get('x-dashboard-secret') === process.env.DASHBOARD_SECRET;
}

/* ── GET /api/members ── List + Search + Stats ── */
export async function GET(request) {
  if (!authCheck(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureInit();
    const sql = getDb();
    const { searchParams } = new URL(request.url);

    const search          = searchParams.get('search')          || '';
    const filterStatus    = searchParams.get('status')          || 'all';
    const filterType      = searchParams.get('type')            || 'all';
    const filterActive    = searchParams.get('is_member_active');   // 'true' | 'false' | null
    const page            = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit           = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const offset          = (page - 1) * limit;

    // Build WHERE dynamically
    const conditions = [];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      conditions.push(`(
        first_name ILIKE $${i} OR last_name  ILIKE $${i} OR
        email      ILIKE $${i} OR phone      ILIKE $${i} OR
        city       ILIKE $${i} OR state      ILIKE $${i}
      )`);
    }
    if (filterStatus !== 'all') {
      params.push(filterStatus);
      conditions.push(`membership_status = $${params.length}`);
    }
    if (filterType !== 'all') {
      params.push(filterType);
      conditions.push(`membership_type = $${params.length}`);
    }
    if (filterActive === 'true') {
      conditions.push(`is_member_active = TRUE`);
    } else if (filterActive === 'false') {
      conditions.push(`is_member_active = FALSE`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const members = await sql(
      `SELECT * FROM members ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const [{ total }] = await sql(`SELECT COUNT(*) AS total FROM members ${where}`, params);

    // Aggregate stats
    const statsRows = await sql`
      SELECT membership_type, membership_status, is_member_active, COUNT(*) AS count
      FROM members
      GROUP BY membership_type, membership_status, is_member_active
    `;

    const stats = {
      total: 0,
      active_members: 0, inactive_members: 0,
      active: 0, inactive: 0, suspended: 0, expired: 0,
      basic: 0, silver: 0, gold: 0,
    };

    statsRows.forEach(({ membership_type, membership_status, is_member_active, count }) => {
      const c = parseInt(count);
      stats.total += c;
      if (is_member_active)  stats.active_members   += c;
      else                   stats.inactive_members  += c;
      stats[membership_status] = (stats[membership_status] || 0) + c;
      stats[membership_type]   = (stats[membership_type]   || 0) + c;
    });

    return NextResponse.json({
      success: true,
      data: members,
      stats,
      pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/members:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── POST /api/members ── Create ── */
export async function POST(request) {
  if (!authCheck(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureInit();
    const sql  = getDb();
    const body = await request.json();

    const {
      first_name, last_name, email, phone,
      date_of_birth, gender, photo_url,
      address, city, state, zip,
      membership_type, membership_status, is_member_active,
      joined_date, expiry_date, notes,
    } = body;

    // Validation
    const errors = {};
    if (!first_name?.trim())  errors.first_name = 'First name is required';
    if (!last_name?.trim())   errors.last_name  = 'Last name is required';
    if (!email?.trim())       errors.email      = 'Email is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address';

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Duplicate email check
    const [dup] = await sql`SELECT id FROM members WHERE email = ${email.trim().toLowerCase()}`;
    if (dup) {
      return NextResponse.json({ success: false, errors: { email: 'Email already registered' } }, { status: 409 });
    }

    const isActive = is_member_active !== undefined ? is_member_active : true;

    const [member] = await sql`
      INSERT INTO members (
        first_name, last_name, email, phone,
        date_of_birth, gender, photo_url,
        address, city, state, zip,
        membership_type, membership_status, is_member_active,
        joined_date, expiry_date, notes
      ) VALUES (
        ${first_name.trim()},
        ${last_name.trim()},
        ${email.trim().toLowerCase()},
        ${phone        || null},
        ${date_of_birth || null},
        ${gender       || null},
        ${photo_url    || null},
        ${address      || null},
        ${city         || null},
        ${state        || null},
        ${zip          || null},
        ${membership_type    || 'basic'},
        ${membership_status  || 'active'},
        ${isActive},
        ${joined_date  || new Date().toISOString().split('T')[0]},
        ${expiry_date  || null},
        ${notes        || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err) {
    console.error('POST /api/members:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
