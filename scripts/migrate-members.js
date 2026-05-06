// scripts/migrate-members.js
// Run: node scripts/migrate-members.js
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  Set DATABASE_URL in .env.local first');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  console.log('🔄  Running MembersMaster migration…');

  // Drop old table if re-running (comment out if you want to keep data)
  // await sql`DROP TABLE IF EXISTS members;`;

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id               SERIAL PRIMARY KEY,

      -- Personal Info
      first_name       TEXT        NOT NULL,
      last_name        TEXT        NOT NULL,
      email            TEXT        NOT NULL UNIQUE,
      phone            TEXT,
      date_of_birth    DATE,
      gender           TEXT        CHECK (gender IN ('male','female','other','prefer_not_to_say')),
      photo_url        TEXT,

      -- Address
      address          TEXT,
      city             TEXT,
      state            TEXT,
      zip              TEXT,

      -- Membership
      membership_type  TEXT        NOT NULL DEFAULT 'basic'
                                   CHECK (membership_type IN ('basic','silver','gold')),
      membership_status TEXT       NOT NULL DEFAULT 'active'
                                   CHECK (membership_status IN ('active','inactive','suspended','expired')),
      is_member_active BOOLEAN     NOT NULL DEFAULT TRUE,
      joined_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
      expiry_date      DATE,

      -- Extra
      notes            TEXT,

      -- Timestamps
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('  ✅  members table created');

  await sql`
    CREATE OR REPLACE FUNCTION touch_members_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_members_updated_at') THEN
        CREATE TRIGGER trg_members_updated_at
        BEFORE UPDATE ON members
        FOR EACH ROW EXECUTE FUNCTION touch_members_updated_at();
      END IF;
    END $$;
  `;
  console.log('  ✅  Trigger ready');

  // Seed sample data
  const [{ count }] = await sql`SELECT COUNT(*) AS count FROM members`;
  if (parseInt(count) === 0) {
    await sql`
      INSERT INTO members
        (first_name, last_name, email, phone,
         date_of_birth, gender, photo_url,
         address, city, state, zip,
         membership_type, membership_status, is_member_active,
         joined_date, expiry_date, notes)
      VALUES
        ('Alice',  'Johnson',  'alice@example.com',  '555-1001',
         '1990-05-20', 'female', NULL,
         '123 Oak Street',   'New York',    'NY', '10001',
         'gold',   'active',    TRUE,  '2024-01-15', '2025-01-15', 'Referred by partner'),

        ('Bob',    'Martinez', 'bob@example.com',    '555-1002',
         '1985-11-30', 'male',   NULL,
         '456 Pine Avenue',  'Los Angeles', 'CA', '90001',
         'silver', 'active',    TRUE,  '2023-06-01', '2025-06-01', NULL),

        ('Carol',  'Lee',      'carol@example.com',  '555-1003',
         '1995-07-14', 'female', NULL,
         '789 Elm Blvd',     'Chicago',     'IL', '60601',
         'basic',  'active',    TRUE,  '2024-03-10', '2025-03-10', NULL),

        ('David',  'Kim',      'david@example.com',  '555-1004',
         '1988-02-28', 'male',   NULL,
         '321 Maple Road',   'Houston',     'TX', '77001',
         'basic',  'inactive',  FALSE, '2023-09-20', '2024-09-20', 'Renewal pending'),

        ('Emma',   'Wilson',   'emma@example.com',   '555-1005',
         '1992-09-03', 'female', NULL,
         '654 Cedar Lane',   'Phoenix',     'AZ', '85001',
         'gold',   'active',    TRUE,  '2024-05-05', '2025-05-05', NULL),

        ('Frank',  'Brown',    'frank@example.com',  '555-1006',
         '1979-04-17', 'male',   NULL,
         '987 Birch Street', 'Philadelphia','PA', '19101',
         'silver', 'suspended', FALSE, '2023-12-01', '2024-12-01', 'Payment overdue'),

        ('Grace',  'Davis',    'grace@example.com',  '555-1007',
         '1993-12-25', 'female', NULL,
         '147 Walnut Drive', 'San Antonio', 'TX', '78201',
         'gold',   'active',    TRUE,  '2024-02-14', '2026-02-14', 'Annual plan'),

        ('Henry',  'Taylor',   'henry@example.com',  '555-1008',
         '1987-08-08', 'male',   NULL,
         '258 Spruce Way',   'San Diego',   'CA', '92101',
         'basic',  'expired',   FALSE, '2023-03-01', '2024-03-01', 'Needs renewal call')
    `;
    console.log('  🌱  Seeded 8 sample members');
  }

  console.log('\n✅  MembersMaster migration complete!');
  process.exit(0);
}

migrate().catch((err) => { console.error('❌', err.message); process.exit(1); });
