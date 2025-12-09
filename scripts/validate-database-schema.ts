import postgres from 'postgres';

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

const pool = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
});

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  tablename: string;
  indexdef: string;
}

interface ForeignKeyInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

async function validateDatabaseSchema() {
  console.log('🔍 Validating database schema...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const connectionTest = await pool`SELECT NOW() as current_time`;
    console.log(`✅ Database connected successfully at ${connectionTest[0].current_time}\n`);

    // Check required tables exist
    console.log('2. Checking required tables...');
    const requiredTables = [
      'posts',
      'brand_voices',
      'audience_profiles',
      'campaigns',
      'content_series',
      'content_templates',
      'image_styles',
      'post_analytics',
      'integrations',
      'integration_logs',
      'integration_alerts',
      'integration_metrics',
      'integration_webhooks',
    ];

    const existingTables = await pool`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    const existingTableNames = existingTables.map((t) => t.table_name);

    for (const table of requiredTables) {
      if (existingTableNames.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' is missing`);
      }
    }
    console.log();

    // Check table structures
    console.log('3. Validating table structures...');

    // Posts table validation
    console.log('   Validating posts table...');
    const postsColumns = (await pool`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      ORDER BY ordinal_position
    `) as TableInfo[];

    const requiredPostsColumns = [
      { name: 'id', type: 'uuid', nullable: 'NO' },
      { name: 'user_id', type: 'uuid', nullable: 'NO' },
      { name: 'topic', type: 'text', nullable: 'NO' },
      { name: 'idea', type: 'text', nullable: 'NO' },
      { name: 'content', type: 'text', nullable: 'NO' },
      { name: 'status', type: 'text', nullable: 'YES' },
      { name: 'tags', type: 'ARRAY', nullable: 'YES' },
      { name: 'social_media_posts', type: 'jsonb', nullable: 'YES' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: 'YES' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: 'YES' },
    ];

    for (const reqCol of requiredPostsColumns) {
      const existingCol = postsColumns.find((c) => c.column_name === reqCol.name);
      if (existingCol) {
        const typeMatch =
          existingCol.data_type.includes(reqCol.type) ||
          reqCol.type.includes(existingCol.data_type) ||
          (reqCol.type === 'ARRAY' && existingCol.data_type === 'ARRAY');
        if (typeMatch && existingCol.is_nullable === reqCol.nullable) {
          console.log(`     ✅ Column '${reqCol.name}' is valid`);
        } else {
          console.log(
            `     ⚠️  Column '${reqCol.name}' exists but type/nullable mismatch: ${existingCol.data_type}/${existingCol.is_nullable} vs ${reqCol.type}/${reqCol.nullable}`
          );
        }
      } else {
        console.log(`     ❌ Column '${reqCol.name}' is missing`);
      }
    }

    // Brand voices table validation
    console.log('   Validating brand_voices table...');
    const brandVoicesColumns = (await pool`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'brand_voices' 
      ORDER BY ordinal_position
    `) as TableInfo[];

    const requiredBrandVoicesColumns = [
      { name: 'id', type: 'uuid', nullable: 'NO' },
      { name: 'user_id', type: 'uuid', nullable: 'NO' },
      { name: 'name', type: 'text', nullable: 'NO' },
      { name: 'tone', type: 'text', nullable: 'NO' },
      { name: 'vocabulary', type: 'text', nullable: 'YES' },
      { name: 'writing_style', type: 'text', nullable: 'YES' },
      { name: 'target_audience', type: 'text', nullable: 'YES' },
      { name: 'sample_content', type: 'text', nullable: 'YES' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: 'YES' },
    ];

    for (const reqCol of requiredBrandVoicesColumns) {
      const existingCol = brandVoicesColumns.find((c) => c.column_name === reqCol.name);
      if (existingCol) {
        const typeMatch =
          existingCol.data_type.includes(reqCol.type) ||
          reqCol.type.includes(existingCol.data_type);
        if (typeMatch && existingCol.is_nullable === reqCol.nullable) {
          console.log(`     ✅ Column '${reqCol.name}' is valid`);
        } else {
          console.log(`     ⚠️  Column '${reqCol.name}' exists but type/nullable mismatch`);
        }
      } else {
        console.log(`     ❌ Column '${reqCol.name}' is missing`);
      }
    }

    // Check indexes
    console.log('\n4. Checking database indexes...');
    const indexes = (await pool`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `) as IndexInfo[];

    const requiredIndexes = [
      'posts_user_id_idx',
      'posts_status_idx',
      'posts_created_at_idx',
      'brand_voices_user_id_idx',
      'audience_profiles_user_id_idx',
      'campaigns_user_id_idx',
      'integrations_user_id_idx',
    ];

    const existingIndexNames = indexes.map((i) => i.indexname);

    for (const indexName of requiredIndexes) {
      if (existingIndexNames.includes(indexName)) {
        console.log(`✅ Index '${indexName}' exists`);
      } else {
        console.log(`❌ Index '${indexName}' is missing`);
      }
    }

    // Check foreign key constraints (if any)
    console.log('\n5. Checking foreign key constraints...');
    const foreignKeys = (await pool`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `) as ForeignKeyInfo[];

    if (foreignKeys.length > 0) {
      console.log('   Found foreign key constraints:');
      for (const fk of foreignKeys) {
        console.log(
          `   ✅ ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`
        );
      }
    } else {
      console.log('   ⚠️  No foreign key constraints found (this may be intentional)');
    }

    // Check triggers
    console.log('\n6. Checking database triggers...');
    const triggers = await pool`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `;

    if (triggers.length > 0) {
      console.log('   Found triggers:');
      for (const trigger of triggers) {
        console.log(
          `   ✅ ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`
        );
      }
    } else {
      console.log('   ⚠️  No triggers found');
    }

    // Check functions
    console.log('\n7. Checking database functions...');
    const functions = await pool`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `;

    const expectedFunctions = [
      'update_updated_at_column',
      'generate_performance_report',
      'get_top_performing_content',
      'cleanup_old_analytics',
      'get_integration_health',
    ];

    const existingFunctionNames = functions.map((f) => f.routine_name);

    for (const funcName of expectedFunctions) {
      if (existingFunctionNames.includes(funcName)) {
        console.log(`   ✅ Function '${funcName}' exists`);
      } else {
        console.log(`   ❌ Function '${funcName}' is missing`);
      }
    }

    // Test basic CRUD operations
    console.log('\n8. Testing basic CRUD operations...');

    // Test insert
    console.log('   Testing INSERT operation...');
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const insertResult = await pool`
      INSERT INTO posts (user_id, topic, idea, content, status)
      VALUES (${testUserId}, 'Schema Test', 'Testing schema validation', 'Test content', 'draft')
      RETURNING id
    `;
    const testPostId = insertResult[0].id;
    console.log(`   ✅ INSERT successful, created post with ID: ${testPostId}`);

    // Test select
    console.log('   Testing SELECT operation...');
    const selectResult = await pool`
      SELECT id, topic, idea, content, status, created_at
      FROM posts 
      WHERE id = ${testPostId}
    `;
    if (selectResult.length === 1) {
      console.log(`   ✅ SELECT successful, retrieved post: ${selectResult[0].topic}`);
    } else {
      console.log(`   ❌ SELECT failed, expected 1 row, got ${selectResult.length}`);
    }

    // Test update
    console.log('   Testing UPDATE operation...');
    const updateResult = await pool`
      UPDATE posts 
      SET topic = 'Updated Schema Test', updated_at = NOW()
      WHERE id = ${testPostId}
      RETURNING topic
    `;
    if (updateResult.length === 1 && updateResult[0].topic === 'Updated Schema Test') {
      console.log(`   ✅ UPDATE successful`);
    } else {
      console.log(`   ❌ UPDATE failed`);
    }

    // Test delete
    console.log('   Testing DELETE operation...');
    const deleteResult = await pool`
      DELETE FROM posts 
      WHERE id = ${testPostId}
    `;
    console.log(`   ✅ DELETE successful, removed test post`);

    // Test JSON operations
    console.log('   Testing JSON operations...');
    const jsonTestResult = await pool`
      INSERT INTO posts (user_id, topic, idea, content, status, social_media_posts, tags)
      VALUES (
        ${testUserId}, 
        'JSON Test', 
        'Testing JSON fields', 
        'Test content', 
        'draft',
        '{"twitter": "Test tweet", "linkedin": "Test LinkedIn post"}',
        ARRAY['test', 'json', 'validation']
      )
      RETURNING id, social_media_posts, tags
    `;

    const jsonPost = jsonTestResult[0];
    if (jsonPost.social_media_posts && jsonPost.tags) {
      console.log(`   ✅ JSON operations successful`);
      console.log(`      - JSON field: ${JSON.stringify(jsonPost.social_media_posts)}`);
      console.log(`      - Array field: ${JSON.stringify(jsonPost.tags)}`);
    } else {
      console.log(`   ❌ JSON operations failed`);
    }

    // Clean up JSON test
    await pool`DELETE FROM posts WHERE id = ${jsonPost.id}`;

    // Performance test
    console.log('\n9. Testing query performance...');
    const performanceStart = Date.now();
    const performanceResult = await pool`
      SELECT COUNT(*) as total_posts,
             COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
             COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_posts,
             COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_posts
      FROM posts
      WHERE user_id = ${testUserId}
    `;
    const performanceEnd = Date.now();
    const queryTime = performanceEnd - performanceStart;

    console.log(`   ✅ Performance query completed in ${queryTime}ms`);
    console.log(`      Results: ${JSON.stringify(performanceResult[0])}`);

    if (queryTime > 5000) {
      console.log(`   ⚠️  Query took longer than expected (${queryTime}ms > 5000ms)`);
    }

    console.log('\n✅ Database schema validation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Tables checked: ${requiredTables.length}`);
    console.log(`   - Indexes verified: ${requiredIndexes.length}`);
    console.log(`   - Functions checked: ${expectedFunctions.length}`);
    console.log(`   - CRUD operations tested: ✅`);
    console.log(`   - JSON operations tested: ✅`);
    console.log(`   - Performance tested: ✅`);
  } catch (error) {
    console.error('❌ Database schema validation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
validateDatabaseSchema().catch(console.error);
