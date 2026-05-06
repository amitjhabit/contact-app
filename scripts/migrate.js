// scripts/migrate.js
// Run: npm run db:migrate
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  Set DATABASE_URL in .env.local first');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  console.log('🔄  Running migrations…');

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL,
      subject    TEXT        NOT NULL DEFAULT 'General Inquiry',
      message    TEXT        NOT NULL,
      status     TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','read','replied','archived')),
      ip         TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('  ✅  contacts table ready');

  await sql`
    CREATE OR REPLACE FUNCTION touch_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contacts_updated_at') THEN
        CREATE TRIGGER trg_contacts_updated_at
        BEFORE UPDATE ON contacts
        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
      END IF;
    END $$;
  `;
  console.log('  ✅  Trigger ready');

  // Seed sample data
  const [{ count }] = await sql`SELECT COUNT(*) AS count FROM contacts`;
  if (parseInt(count) === 0) {
    await sql`
      INSERT INTO contacts (name, email, subject, message, status) VALUES
        ('Alice Johnson',  'alice@example.com', 'Technical Support',   'Having trouble logging in to my account. The password reset email isn''t arriving.',         'new'),
        ('Bob Martinez',   'bob@example.com',   'General Inquiry',     'Hi, I''d love to learn more about your enterprise pricing options for a team of 50.',         'read'),
        ('Carol Lee',      'carol@example.com', 'Feature Request',     'It would be amazing if you could add a dark mode option to the dashboard. Many of us work late!', 'replied'),
        ('David Kim',      'david@example.com', 'Bug Report',          'Found a bug: when I submit the form with special characters in my name, I get a 500 error.',  'archived'),
        ('Emma Wilson',    'emma@example.com',  'Partnership / Collaboration', 'We run a design agency and would love to explore a white-label partnership.',           'new')
    `;
    console.log('  🌱  Seeded 5 sample contacts');
  }

  console.log('\n✅  Migration complete! Run: npm run dev');
  process.exit(0);
}

migrate().catch((err) => { console.error('❌', err); process.exit(1); });
