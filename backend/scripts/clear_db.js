#!/usr/bin/env node
// Safe DB clear script for Render Postgres
// Usage:
//  DATABASE_URL="postgresql://user:pass@host:port/db" node clear_db.js --truncate --yes
//  DATABASE_URL="..." node clear_db.js --drop-schema --confirm DROP

import { Client } from 'pg';

function usageAndExit() {
  console.log('Usage: DATABASE_URL=... node clear_db.js [--truncate|--drop-schema] [--yes|--confirm DROP]');
  process.exit(1);
}

const args = process.argv.slice(2);
const doDrop = args.includes('--drop-schema');
const doTruncate = args.includes('--truncate') || (!doDrop && args.length === 0);
const yesFlag = args.includes('--yes');
const confirmArgIndex = args.indexOf('--confirm');
const confirmValue = confirmArgIndex !== -1 ? args[confirmArgIndex + 1] : undefined;

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || null;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL (or PG_CONNECTION) env var is required.');
  usageAndExit();
}

if (doDrop) {
  if (confirmValue !== 'DROP' && !yesFlag && process.env.CONFIRM !== 'DROP') {
    console.error('To run --drop-schema you must pass --confirm DROP or set CONFIRM=DROP env var. This is destructive.');
    process.exit(2);
  }
}

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    if (doDrop) {
      console.log('Dropping public schema (this removes ALL tables and data)...');
      await client.query('DROP SCHEMA public CASCADE');
      await client.query('CREATE SCHEMA public');
      console.log('Schema dropped and recreated.');
      process.exit(0);
    }

    // Truncate all tables in public schema
    console.log('Fetching tables in public schema...');
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public';");
    const tables = res.rows.map(r => r.tablename).filter(Boolean);

    if (tables.length === 0) {
      console.log('No tables found in public schema. Nothing to do.');
      process.exit(0);
    }

    console.log('Tables to truncate:', tables.join(', '));
    if (!yesFlag && process.env.CONFIRM !== 'YES') {
      console.error('This will TRUNCATE the tables above and reset identities. To confirm, re-run with --yes or set CONFIRM=YES');
      process.exit(2);
    }

    const quoted = tables.map(t => `public."${t.replace(/"/g, '""')}"`).join(', ');
    const sql = `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`;
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Truncate completed successfully.');
  } catch (err) {
    console.error('Error clearing DB:', err && err.message ? err.message : err);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exit(3);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
