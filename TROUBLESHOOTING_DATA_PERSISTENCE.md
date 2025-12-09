# 🔧 Data Persistence Troubleshooting Guide

## **Quick Fix Steps**

### 1. **Check Browser Console**

Open your browser's developer tools (F12) and look for any error messages. The updated code now includes detailed logging.

### 2. **Verify Database Schema**

Run this in your Neon SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'brand_voices', 'audience_profiles', 'campaigns');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'posts';
```

### 3. **Test Authentication**

The app uses Stack Auth for authentication. Check your Stack Auth configuration in your environment variables.

### 4. **Test Database Connection**

Verify your Neon database connection string is set correctly in your environment variables as `DATABASE_URL`.

## **Common Issues & Solutions**

### **Issue: "User not authenticated" error**

**Solution:**

1. Verify your Stack Auth credentials are set correctly in environment variables
2. Check that `VITE_STACK_PROJECT_ID` and `VITE_STACK_PUBLISHABLE_CLIENT_KEY` are configured
3. Ensure users are properly authenticated through Stack Auth

### **Issue: "Permission denied" error**

**Solution:**

1. RLS policies might not be applied correctly
2. Run the database schema fix script
3. Check if the user_id matches in the database

### **Issue: "Table doesn't exist" error**

**Solution:**

1. Apply the complete database schema
2. Run the migration scripts using Neon SQL Editor
3. Or manually run the SQL in your Neon SQL Editor

### **Issue: Data saves but doesn't appear**

**Solution:**

1. Check if the user_id is being set correctly
2. Verify RLS policies allow the user to see their own data
3. Clear browser cache and refresh

## **Step-by-Step Fix Process**

### **Step 1: Apply Database Schema**

1. Go to your Neon project dashboard (https://console.neon.tech/)
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/neon-complete-migration.sql`
4. Run the script

### **Step 2: Verify Stack Auth Configuration**

1. Check your Stack Auth project settings (https://app.stack-auth.com/)
2. Verify environment variables are set correctly
3. Ensure the app can authenticate users properly

### **Step 3: Test the Fix**

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Look for the console messages:
   - ✅ User authenticated: [user-id]
   - ✅ Post saved successfully
4. Try creating a new post

### **Step 4: Verify Data Persistence**

1. Create a post
2. Refresh the page
3. Check if the post appears in the list
4. Check the database directly in Neon console

## **Debug Commands**

### **Check User Authentication**

```javascript
// In browser console
import { useUser } from '@stackframe/react';
// Use Stack Auth hooks in React components
// For API routes, use Stack Auth server SDK
```

### **Test Database Operations**

```javascript
// Use API endpoints or databaseService for database operations
// Example: fetch('/api/posts')

// Test getting posts
db.getPosts()
  .then((posts) => {
    console.log('All posts:', posts);
  })
  .catch((err) => {
    console.error('Error getting posts:', err);
  });

// Test saving a post
const testPost = {
  topic: 'Test Topic',
  idea: 'Test Idea',
  content: 'Test Content',
  status: 'draft',
};

db.addPost(testPost)
  .then((post) => {
    console.log('Post saved:', post);
  })
  .catch((err) => {
    console.error('Error saving post:', err);
  });
```

### **Check Database Tables**

```sql
-- In Neon SQL Editor
SELECT COUNT(*) as post_count FROM posts;
SELECT user_id, COUNT(*) as post_count FROM posts GROUP BY user_id;
```

## **Environment Variables Check**

Make sure these are set in your `.env.local` file:

```env
# Stack Auth Configuration
VITE_STACK_PROJECT_ID=your_project_id
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_client_key
STACK_SECRET_SERVER_KEY=your_server_key

# Neon Database
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Integration Encryption
INTEGRATION_ENCRYPTION_SECRET=your_64_char_hex_string
```

## **Neon Database Settings**

1. **Database Configuration:**
   - Ensure your Neon project is active
   - Verify the connection string is correct
   - Check that SSL mode is set to `require`

2. **Schema Setup:**
   - Apply the complete Neon schema migration
   - Verify all tables are created
   - Check that indexes are in place

3. **Connection Settings:**
   - Use connection pooling for better performance
   - Set appropriate timeout values
   - Monitor connection usage

## **Still Having Issues?**

If you're still experiencing problems:

1. **Check the browser console** for detailed error messages
2. **Verify your Supabase project** is active and accessible
3. **Test with a fresh browser session** (incognito mode)
4. **Check your internet connection** and Supabase status
5. **Try the debug script** in `debug-data-persistence.js`

## **Success Indicators**

You'll know the fix is working when you see:

1. ✅ Console messages showing successful authentication
2. ✅ Posts saving without errors
3. ✅ Data persisting after page refresh
4. ✅ No "permission denied" errors
5. ✅ User ID being set correctly in database

## **Need More Help?**

If you're still having issues, please share:

1. The exact error messages from the browser console
2. Your Neon database connection string
3. Which step of the troubleshooting process you're stuck on
