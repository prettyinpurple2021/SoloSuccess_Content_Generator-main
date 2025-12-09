#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envLines = envContent.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

  envLines.forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const postgres = require('postgres');

async function completeRLSMigration() {
  console.log('🔒 Starting Complete RLS Migration...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  try {
    console.log('📋 Enabling RLS on brand_voices table...');
    await sql`ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Users can access own brand voices" ON brand_voices`;
    await sql`CREATE POLICY "Users can access own brand voices" ON brand_voices
        FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
    console.log('✅ RLS enabled on brand_voices');

    console.log('📋 Enabling RLS on audience_profiles table...');
    await sql`ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Users can access own audience profiles" ON audience_profiles`;
    await sql`CREATE POLICY "Users can access own audience profiles" ON audience_profiles
        FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
    console.log('✅ RLS enabled on audience_profiles');

    console.log('📋 Enabling RLS on campaigns table...');
    await sql`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Users can access own campaigns" ON campaigns`;
    await sql`CREATE POLICY "Users can access own campaigns" ON campaigns
        FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
    console.log('✅ RLS enabled on campaigns');

    console.log('📋 Enabling RLS on content_series table...');
    await sql`ALTER TABLE content_series ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Users can access own content series" ON content_series`;
    await sql`CREATE POLICY "Users can access own content series" ON content_series
        FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
    console.log('✅ RLS enabled on content_series');

    // Check if integrations table exists and enable RLS
    console.log('📋 Checking integrations table...');
    const integrationsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'integrations'
      )
    `;

    if (integrationsExists[0].exists) {
      await sql`ALTER TABLE integrations ENABLE ROW LEVEL SECURITY`;
      await sql`DROP POLICY IF EXISTS "Users can access own integrations" ON integrations`;
      await sql`CREATE POLICY "Users can access own integrations" ON integrations
          FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
      console.log('✅ RLS enabled on integrations');
    } else {
      console.log('ℹ️  integrations table does not exist, skipping');
    }

    // Check if post_analytics table exists and enable RLS
    console.log('📋 Checking post_analytics table...');
    const analyticsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'post_analytics'
      )
    `;

    if (analyticsExists[0].exists) {
      await sql`ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY`;
      await sql`DROP POLICY IF EXISTS "Users can access analytics for own posts" ON post_analytics`;
      await sql`CREATE POLICY "Users can access analytics for own posts" ON post_analytics
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM posts 
              WHERE posts.id = post_analytics.post_id 
              AND posts.user_id = (CURRENT_USER)::uuid
            )
          )`;
      console.log('✅ RLS enabled on post_analytics');
    } else {
      console.log('ℹ️  post_analytics table does not exist, skipping');
    }

    // Check if content_templates table exists with user_id and enable RLS
    console.log('📋 Checking content_templates table...');
    const templatesUserIdExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'content_templates' AND column_name = 'user_id'
      )
    `;

    if (templatesUserIdExists[0].exists) {
      await sql`ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY`;
      await sql`DROP POLICY IF EXISTS "Users can access own templates or public" ON content_templates`;
      await sql`CREATE POLICY "Users can access own templates or public" ON content_templates
          FOR ALL USING (user_id = (CURRENT_USER)::uuid OR is_public = true)`;
      console.log('✅ RLS enabled on content_templates');
    } else {
      console.log('ℹ️  content_templates table does not have user_id column, skipping');
    }

    // Check if image_styles table exists and enable RLS
    console.log('📋 Checking image_styles table...');
    const imageStylesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'image_styles'
      )
    `;

    if (imageStylesExists[0].exists) {
      await sql`ALTER TABLE image_styles ENABLE ROW LEVEL SECURITY`;
      await sql`DROP POLICY IF EXISTS "Users can access own image styles" ON image_styles`;
      await sql`CREATE POLICY "Users can access own image styles" ON image_styles
          FOR ALL USING (user_id = (CURRENT_USER)::uuid)`;
      console.log('✅ RLS enabled on image_styles');
    } else {
      console.log('ℹ️  image_styles table does not exist, skipping');
    }

    // Verify RLS status on all tables
    console.log('\n📊 Verifying RLS Status:');
    console.log('========================');

    const rlsStatus = await sql`
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        CASE 
          WHEN rowsecurity THEN 'RLS ENABLED' 
          ELSE 'RLS DISABLED' 
        END as status
      FROM pg_tables 
      WHERE tablename IN (
        'posts', 'brand_voices', 'audience_profiles', 'campaigns', 
        'content_series', 'integrations', 'post_analytics', 
        'content_templates', 'image_styles'
      )
      AND schemaname = 'public'
      ORDER BY tablename
    `;

    rlsStatus.forEach((table) => {
      const icon = table.rls_enabled ? '✅' : '❌';
      console.log(`${icon} ${table.tablename}: ${table.status}`);
    });

    // Count enabled tables
    const enabledCount = rlsStatus.filter((t) => t.rls_enabled).length;
    const totalCount = rlsStatus.length;

    console.log(`\n📈 RLS Summary: ${enabledCount}/${totalCount} tables have RLS enabled`);

    if (enabledCount === totalCount) {
      console.log(
        '\n🎉 RLS Migration Complete! All user-specific tables now have Row Level Security enabled.'
      );
    } else {
      console.log(
        '\n⚠️  Some tables still need RLS configuration. Please review the output above.'
      );
    }
  } catch (error) {
    console.error('❌ RLS Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the migration
completeRLSMigration()
  .then(() => {
    console.log('\n✅ RLS Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ RLS Migration failed:', error);
    process.exit(1);
  });
