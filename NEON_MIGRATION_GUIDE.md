# Neon Database Migration Guide

## 🚀 Getting Started with Neon MCP Resource

The Neon MCP (Model Context Protocol) Resource allows you to interact with your Neon database directly from Cursor's AI chat interface using natural language commands.

### Initial Setup

1. **Open your terminal** in the project directory:

   ```bash
   cd C:\Users\prett\Desktop\SoloSuccess-ai-content-planner
   ```

2. **Initialize Neon MCP integration**:

   ```bash
   npx neonctl@latest init
   ```

3. **Follow the setup wizard**:
   - The command will guide you through authentication
   - You'll need to log in to your Neon account (or create one at https://neon.tech)
   - Select or create a Neon project
   - The MCP server will be configured automatically

4. **Restart Cursor**:
   - Close and restart Cursor to apply the MCP configuration
   - The Neon MCP server will be available in Cursor's chat interface

### Using Neon MCP in Cursor

After setup, you can interact with your Neon database using natural language in Cursor's chat:

**Example commands:**

- "Show me all tables in my Neon database"
- "Create a new table for user preferences"
- "Query the posts table for all entries from this month"
- "Check the database connection status"
- "Run a migration script"
- "Get the schema for the integrations table"

### Security Considerations

⚠️ **Important**: The Neon MCP Server grants powerful database management capabilities through natural language requests.

- ✅ **Intended for**: Local development and IDE integrations
- ❌ **Not for**: Production environments
- 🔒 **Always**: Review actions before execution
- 🛡️ **Best practice**: Use read-only operations when possible in production

### Troubleshooting

If the MCP integration doesn't work:

1. **Verify installation**:

   ```bash
   npx neonctl@latest --version
   ```

2. **Check MCP configuration**:
   - Look for MCP configuration files in your project
   - Verify your Neon credentials are correct

3. **Re-initialize if needed**:

   ```bash
   npx neonctl@latest init --force
   ```

4. **Check Cursor settings**:
   - Ensure MCP servers are enabled in Cursor settings
   - Verify the Neon MCP server is listed in your MCP configuration

---

## 📊 Database Migration Steps

### Steps to Fix the Database Errors:

### If you haven't run any migration yet:

1. **Open Neon Console**: https://console.neon.tech/
2. **Select your project**: Your Neon project
3. **Go to SQL Editor** (left sidebar)
4. **Click "New Query"**
5. **Copy and paste the contents of `database/neon-complete-migration.sql`**
6. **Click "Run"**

### If you already ran the initial migration (some tables exist):

1. **Open Neon Console**: https://console.neon.tech/
2. **Select your project**: Your Neon project
3. **Go to SQL Editor** (left sidebar)
4. **Click "New Query"**
5. **Copy and paste the contents of `database/add-rls-to-existing-tables.sql`**
6. **Click "Run"**

This will add Row-Level Security policies and missing columns to your existing tables.

## Key Changes from Supabase Version:

- **User IDs**: Changed from `UUID REFERENCES auth.users(id)` to `TEXT NOT NULL` (since Neon doesn't have built-in auth)
- **Row Level Security**: Added RLS policies using `current_user` instead of `auth.uid()`
- **Realtime**: Removed Supabase realtime publications (Neon doesn't have built-in realtime)
- **Added Missing Tables**:
  - `hashtag_performance` (for socialPlatformService.ts)
  - `webhook_deliveries` (for webhookService.ts)
- **Added Missing Fields**:
  - `personality_traits`, `communication_style`, `brand_values` in `brand_voices`
  - `demographics`, `behavior_patterns`, `content_preferences` in `audience_profiles`

## After Migration:

- Refresh your app
- Database-related errors should be gone
- Integration features will work
- Social platform services will work
- Webhook services will work

The migration is safe to run multiple times and preserves existing data.

## What This Fixes:

- ✅ All `services/socialPlatformService.ts` database errors
- ✅ All `services/webhookService.ts` database errors
- ✅ All `services/neonService.ts` database errors
- ✅ All `services/databaseService.ts` database errors
- ✅ Missing table errors across all services
- ✅ TypeScript errors related to missing database schema
