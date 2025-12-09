# Database Setup Instructions

## Issue: 400 Errors from Missing Integration Tables

Your console shows 400 errors because the integration tables (`integrations`, `integration_logs`, etc.) don't exist in your Neon PostgreSQL database yet.

## Solution: Apply Database Migration

### Step 1: Access Your Neon Dashboard

1. Go to [https://console.neon.tech/](https://console.neon.tech/)
2. Sign in to your account
3. Select your project

### Step 2: Open SQL Editor

1. In your Neon dashboard, click on your project
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL query

### Step 3: Apply the Migration

1. Copy the entire contents of `database/neon-complete-migration.sql` file (or the appropriate migration file for your setup)
2. Paste it into the SQL Editor
3. Click **Run** to execute the migration

### Step 4: Verify the Migration

After running the migration, you should see:

- ✅ All tables created successfully
- ✅ All indexes and policies applied
- ✅ Integration tables are ready

### Step 5: Test Your Application

1. Refresh your application
2. The 400 errors should be resolved
3. Integration features should work properly

## What the Migration Does

The migration creates all necessary tables:

- **Core Tables**: `posts`, `brand_voices`, `audience_profiles`, `campaigns`, etc.
- **Integration Tables**: `integrations`, `integration_logs`, `integration_alerts`, etc.
- **Security**: Row Level Security (RLS) policies for all tables
- **Performance**: Proper indexes for optimal query performance
- **Realtime**: Enables real-time subscriptions for all tables

## Alternative: Manual Table Creation

If you prefer to create tables individually, you can run these files in order:

1. `database/neon-schema.sql` (base schema for Neon)
2. `database/neon-integration-schema-migration.sql` (integration management)
3. `database/performance-optimization.sql` (optional performance optimizations)

**Note:** This project uses Neon PostgreSQL, not Supabase. Make sure you're using the Neon-compatible migration files.

## Troubleshooting

### If you get permission errors:

- Make sure you're logged in as the project owner
- Check that your Neon project is active
- Verify your database connection string has the correct permissions

### If tables already exist:

- The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- Existing data will be preserved

### If you need to start fresh:

- You can drop existing tables and re-run the migration
- **Warning**: This will delete all existing data
- Always backup your data before dropping tables

## Next Steps

After applying the migration:

1. ✅ Database schema issues resolved
2. ✅ Integration tables created
3. ✅ Form validation warnings fixed
4. ✅ Application should work without 400 errors

Your SoloSuccess AI Content Planner is now ready to use with full integration management capabilities!
