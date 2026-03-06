/**
 * Migration script to fix reset_token and reset_expires columns
 * Run this after deploying the fix to ensure databases have the correct columns
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('DATABASE_URL not set - skipping migration');
  process.exit(0);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrateResetColumns() {
  try {
    console.log('🔄 Fixing reset_token and reset_expires columns...');

    // Check if the camelCase columns exist
    const checkCamelCase = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('resetToken', 'resetExpires')
    `);

    // Check if the snake_case columns exist
    const checkSnakeCase = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_expires')
    `);

    const hasCamelCase = checkCamelCase.rows.length > 0;
    const hasSnakeCase = checkSnakeCase.rows.length > 0;

    console.log(`Current state - camelCase columns: ${hasCamelCase}, snake_case columns: ${hasSnakeCase}`);

    if (hasCamelCase && !hasSnakeCase) {
      // Migrate from camelCase to snake_case
      console.log('⚠️  Found camelCase columns - migrating to snake_case...');
      
      // Check if data exists
      const dataCheck = await pool.query(`
        SELECT COUNT(*) FROM users WHERE "resetToken" IS NOT NULL OR "resetExpires" IS NOT NULL
      `);
      
      if (parseInt(dataCheck.rows[0].count) > 0) {
        console.log(`Found ${dataCheck.rows[0].count} rows with reset data - copying to snake_case columns...`);
        
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
        `);

        await pool.query(`
          UPDATE users 
          SET reset_token = "resetToken", reset_expires = "resetExpires"
          WHERE "resetToken" IS NOT NULL OR "resetExpires" IS NOT NULL
        `);

        console.log('✅ Data migrated to snake_case columns');
      } else {
        console.log('No reset data found - just adding snake_case columns');
        await pool.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
        `);
      }

      // Drop the old columns
      console.log('Dropping old camelCase columns...');
      await pool.query(`
        ALTER TABLE users DROP COLUMN IF EXISTS "resetToken" CASCADE;
        ALTER TABLE users DROP COLUMN IF EXISTS "resetExpires" CASCADE;
      `);

      console.log('✅ Dropped old camelCase columns');
    } else if (!hasSnakeCase) {
      // Add the columns if they don't exist
      console.log('Adding reset_token and reset_expires columns...');
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
      `);
      console.log('✅ Columns added successfully');
    } else {
      console.log('✅ snake_case columns already exist - no migration needed');
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateResetColumns();
