// Migration script to add PayChangu/Flutterwave columns to payments table
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS "externalCheckoutUrl" TEXT;
    `);
    await client.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    await client.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS "externalData" JSONB;
    `);
    console.log('Migration complete: Columns added to payments table.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
