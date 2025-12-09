# Database Schema Documentation

## Overview

This directory contains the database schema files for the SoloSuccess AI Content Factory application.

## Files

### `schema.sql`

The base database schema with the core `posts` table and basic functionality.

### `enhanced-schema-migration.sql`

Migration script that adds enhanced content features including:

- Brand voice management
- Audience profiling
- Campaign and content series management
- Analytics tracking
- Content templates
- Image style management

### `rollback-enhanced-schema.sql`

Rollback script to remove all enhanced features and revert to the base schema.

## Migration Instructions

### Applying the Enhanced Schema

1. **Prerequisites**: Ensure the base schema (`schema.sql`) has been applied first
2. **Backup**: Create a backup of your database before running the migration
3. **Apply Migration**: Run the `enhanced-schema-migration.sql` script in your Neon SQL Editor

```sql
-- Copy and paste the contents of enhanced-schema-migration.sql
-- into your Neon SQL Editor and execute
```

### Rolling Back (if needed)

If you need to remove the enhanced features:

```sql
-- Copy and paste the contents of rollback-enhanced-schema.sql
-- into your Neon SQL Editor and execute
```

## New Tables Added

### `brand_voices`

Stores user-defined brand voice configurations for content personalization.

**Key Fields:**

- `name`: Brand voice name
- `tone`: Writing tone (professional, casual, etc.)
- `vocabulary`: Preferred vocabulary terms
- `writing_style`: Style description
- `sample_content`: Example content for AI training

### `audience_profiles`

Stores target audience definitions for content optimization.

**Key Fields:**

- `name`: Profile name
- `age_range`: Target age demographic
- `industry`: Target industry
- `interests`: Audience interests array
- `pain_points`: Known audience challenges
- `engagement_patterns`: Historical engagement data (JSONB)

### `campaigns`

Manages content campaigns and coordinated content efforts.

**Key Fields:**

- `name`: Campaign name
- `theme`: Campaign theme/topic
- `start_date`/`end_date`: Campaign duration
- `platforms`: Target platforms array
- `status`: Campaign status (draft, active, completed, paused)
- `performance`: Campaign metrics (JSONB)

### `content_series`

Manages multi-post content series within campaigns.

**Key Fields:**

- `campaign_id`: Parent campaign (optional)
- `name`: Series name
- `theme`: Series theme
- `total_posts`: Planned number of posts
- `frequency`: Posting frequency (daily, weekly, biweekly)
- `current_post`: Current position in series

### `post_analytics`

Tracks performance metrics for published content.

**Key Fields:**

- `post_id`: Reference to posts table
- `platform`: Social media platform
- `likes`, `shares`, `comments`, `clicks`: Engagement metrics
- `impressions`, `reach`: Visibility metrics
- `engagement_rate`: Calculated engagement percentage

### `content_templates`

Stores reusable content templates and structures.

**Key Fields:**

- `name`: Template name
- `category`: Template category
- `content_type`: Type (blog, social, email, video)
- `structure`: Template structure (JSONB)
- `customizable_fields`: Editable fields definition (JSONB)
- `is_public`: Whether template is shared publicly

### `image_styles`

Manages consistent image generation styles and brand assets.

**Key Fields:**

- `name`: Style name
- `style_prompt`: AI generation prompt
- `color_palette`: Brand colors array
- `visual_elements`: Style elements array
- `brand_assets`: Brand asset definitions (JSONB)

## Enhanced Posts Table

The existing `posts` table has been extended with new optional foreign key columns:

- `brand_voice_id`: Links to brand_voices table
- `audience_profile_id`: Links to audience_profiles table
- `campaign_id`: Links to campaigns table
- `series_id`: Links to content_series table
- `template_id`: Links to content_templates table
- `image_style_id`: Links to image_styles table
- `performance_score`: Calculated performance score (0-10)
- `optimization_suggestions`: AI-generated suggestions (JSONB)

## Security

All new tables implement Row Level Security (RLS) policies:

- Users can only access their own data
- Content templates support public sharing when `is_public = true`
- Analytics data inherits permissions from the associated posts

## Performance

The migration includes optimized indexes for:

- Foreign key relationships
- Common query patterns
- Performance-critical fields (engagement rates, scores)
- Date-based queries

## Triggers and Functions

### Automatic Updates

- `updated_at` triggers for all tables
- Automatic engagement rate calculation
- Performance score updates based on analytics

### Helper Functions

- `calculate_engagement_rate()`: Computes engagement percentages
- `update_post_performance_score()`: Updates post performance based on analytics
- `trigger_update_performance_score()`: Automatic trigger function

## Real-time Subscriptions

**Note**: Neon PostgreSQL doesn't have built-in realtime like Supabase. If you need realtime functionality, consider using:

- WebSockets via API routes
- Server-Sent Events (SSE)
- Third-party realtime services like Pusher, Ably, or Socket.io

## Sample Data

The migration includes optional sample data insertion for development:

- Default brand voices (Professional, Casual & Friendly)
- Sample audience profile (Small Business Owners)
- Basic blog post template

Sample data is only inserted if no existing data is found and a user is authenticated.
