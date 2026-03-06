-- SQL Migration Script to fix reset_token and reset_expires columns
-- This script handles the conversion from camelCase to snake_case column names

-- Step 1: Add snake_case columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- Step 2: Migrate data from camelCase to snake_case if camelCase columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'resetToken') THEN
    UPDATE users SET reset_token = "resetToken" WHERE "resetToken" IS NOT NULL;
    ALTER TABLE users DROP COLUMN IF EXISTS "resetToken" CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'resetExpires') THEN
    UPDATE users SET reset_expires = "resetExpires" WHERE "resetExpires" IS NOT NULL;
    ALTER TABLE users DROP COLUMN IF EXISTS "resetExpires" CASCADE;
  END IF;
END $$;

-- Verify the columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_expires')
ORDER BY column_name;
