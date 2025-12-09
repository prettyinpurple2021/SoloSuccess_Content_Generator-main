# Firebase to Supabase Migration Plan

## Overview

Replace Firebase with Supabase to eliminate Google Cloud dependencies while maintaining all functionality with free alternatives.

## Migration Steps

### 1. Setup Supabase Project

1. Create free Supabase account at https://supabase.com
2. Create new project (free tier: 500MB database, 2GB bandwidth)
3. Get project URL and anon key from Settings > API

### 2. Database Schema Migration

Create PostgreSQL tables to replace Firestore collections:

```sql
-- Posts table (replaces scheduledBlogPosts collection)
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  topic TEXT NOT NULL,
  idea TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'posted')) DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  headlines TEXT[] DEFAULT '{}',
  social_media_posts JSONB DEFAULT '{}',
  social_media_tones JSONB DEFAULT '{}',
  social_media_audiences JSONB DEFAULT '{}',
  selected_image TEXT,
  schedule_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users to access their own posts
CREATE POLICY "Users can access own posts" ON posts
  FOR ALL USING (auth.uid() = user_id);
```

### 3. Code Changes Required

#### Replace Firebase Dependencies

- Remove `firebase` package
- Add `@supabase/supabase-js` package
- Update package.json

#### Service Layer Changes

- Replace `firebaseService.ts` with `supabaseService.ts`
- Update authentication to use Supabase Auth
- Replace Firestore queries with Supabase queries
- Update real-time subscriptions

#### Type Definitions

- Replace Firebase types with Supabase types
- Update Timestamp handling (use ISO strings instead of Firebase Timestamp)
- Remove Firebase-specific interfaces

#### Component Updates

- Update App.tsx to use Supabase service
- Replace Firebase auth state management
- Update data fetching and mutations

### 4. Environment Variables

Replace Firebase config with Supabase config:

```env
# Add these Supabase variables
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Keep Gemini AI
GEMINI_API_KEY=your-gemini-key

# Keep Blogger integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_API_KEY=your-google-api-key
```

### 5. Keep Blogger Integration

- Keep Blogger integration (`bloggerService.ts`) - no changes needed
- Keep Google OAuth setup for Blogger publishing
- Remove Google Analytics (Firebase Analytics dependency)

### 6. Benefits of Migration

- **Cost**: Completely free (Supabase free tier)
- **No Vendor Lock-in**: Open source PostgreSQL
- **Better Performance**: Direct SQL queries vs Firestore limitations
- **Simpler Auth**: No Google OAuth complexity
- **Real-time**: Still maintains live updates via Supabase Realtime

### 7. Implementation Priority

1. Setup Supabase project and database schema
2. Create new supabaseService.ts
3. Update types.ts for Supabase compatibility
4. Migrate authentication logic
5. Replace database operations
6. Keep Blogger integration (no changes needed)
7. Test all functionality
8. Update environment variables
9. Remove Firebase dependencies (except Blogger API usage)

## Free Tier Limitations

- **Supabase**: 500MB database, 2GB bandwidth/month
- **Gemini AI**: Generous free tier for API calls
- **Hosting**: Can use Vercel, Netlify, or GitHub Pages (all free)

This migration eliminates all Google Cloud costs while maintaining full functionality.
