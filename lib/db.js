// lib/db.js
import { neon } from '@neondatabase/serverless';

let _sql;

export function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Copy .env.local.example → .env.local and fill it in.');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function initDb() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL,
      subject    TEXT        NOT NULL DEFAULT 'General Inquiry',
      message    TEXT        NOT NULL,
      status     TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'read', 'replied', 'archived')),
      ip         TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE OR REPLACE FUNCTION touch_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contacts_updated_at'
      ) THEN
        CREATE TRIGGER trg_contacts_updated_at
        BEFORE UPDATE ON contacts
        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
      END IF;
    END $$;
  `;
}

// one-time init guard (avoids repeated CREATE TABLE on every request)
let _initialized = false;
export async function ensureInit() {
  if (!_initialized) {
    await initDb();
    _initialized = true;
  }
}
