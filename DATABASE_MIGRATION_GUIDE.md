# Database Migration: Fix reset_token and reset_expires Columns

## Problem
The error `column "reset_token" of relation "users" does not exist` occurs because the database schema was creating camelCase column names (`resetToken`, `resetExpires`) instead of snake_case (`reset_token`, `reset_expires`), but the application code expects snake_case.

## Solution

### Option 1: Run Migration via Render Dashboard (Recommended for Quick Fix)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Navigate to your PostgreSQL database**
3. **Open the PostgreSQL Instance → Shell**
4. **Run the SQL migration**:

```sql
-- Add snake_case columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- Verify the columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_expires')
ORDER BY column_name;
```

5. **If old camelCase columns exist**, run this to migrate data:

```sql
-- Backup and migrate existing data (if any)
UPDATE users SET reset_token = "resetToken" WHERE "resetToken" IS NOT NULL;
UPDATE users SET reset_expires = "resetExpires" WHERE "resetExpires" IS NOT NULL;

-- Drop old columns
ALTER TABLE users DROP COLUMN IF EXISTS "resetToken" CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS "resetExpires" CASCADE;
```

### Option 2: Run Migration Script Locally

If you have PostgreSQL client installed:

```bash
# Copy the SQL file and run it
psql $DATABASE_URL < backend/scripts/fix_reset_columns.sql

# OR run the Node.js migration script
cd backend
node scripts/fix_reset_columns.js
```

### Option 3: Deploy and Let Automatic Migration Run

The latest code in `backend/database.js` has been fixed to:
- ✅ Create columns with snake_case names
- ✅ Automatically handle migration on startup
- ✅ Support both naming conventions during transition

Simply redeploy your application:
```bash
git push  # Triggers automatic Render redeploy
```

## What Was Fixed

### Backend Changes:
- ✅ Updated `database.js` schema to use `reset_token` and `reset_expires` (snake_case)
- ✅ Migration scripts created to handle column name conversion
- ✅ Field mapping in `updateOne()` already converts camelCase → snake_case

### Files Modified:
- `backend/database.js` - Fixed schema definition
- `backend/scripts/fix_reset_columns.js` - Node.js migration script
- `backend/scripts/fix_reset_columns.sql` - Direct SQL migration

## Verification

After running the migration, verify the columns exist:

```sql
-- CheckRender Database
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;
```

Look for `reset_token` and `reset_expires` in the output.

## Testing Password Reset After Fix

Once the migration is complete:

1. **Test Password Reset Request**:
   ```bash
   curl -X POST https://your-api.onrender.com/api/auth/request-reset \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Test Password Reset Completion**:
   ```bash
   curl -X POST https://your-api.onrender.com/api/auth/reset \
     -H "Content-Type: application/json" \
     -d '{
       "token": "YOUR_RESET_TOKEN_HERE",
       "newPassword": "NewPass123"
     }'
   ```

## Expected Result

✅ Columns are named correctly: `reset_token`, `reset_expires`
✅ Password reset works end-to-end
✅ No more "column does not exist" errors
✅ Full compatibility with frontend password reset flow

---

**Questions?** Check the error logs in your Render deployment to see what happened.
