// app/api/health/route.js
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const result = { status: 'ok', timestamp: new Date().toISOString(), database: { status: 'unknown' } };
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    result.database = { status: 'connected', provider: 'Neon PostgreSQL (free tier)' };
  } catch (err) {
    result.database = { status: 'error', error: err.message };
    result.status = 'degraded';
  }
  return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 503 });
}
