import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔄 Testing Neon database connection...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function testConnection() {
  try {
    // Test basic connection
    console.log('🔄 Testing basic connection...');
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    console.log('✅ Connection successful!');
    console.log(`   Current time: ${result[0].current_time}`);
    console.log(`   PostgreSQL version: ${result[0].postgres_version}`);

    // Test table access
    console.log('🔄 Testing table access...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log('✅ Tables accessible:');
    tables.forEach((table) => {
      console.log(`   - ${table.table_name}`);
    });

    // Test inserting a sample post
    console.log('🔄 Testing data insertion...');
    const testUserId = '00000000-0000-0000-0000-000000000000';

    const insertResult = await sql`
      INSERT INTO posts (user_id, topic, idea, content, status) 
      VALUES (${testUserId}, 'Test Migration', 'Testing Neon connection', 'This is a test post to verify Neon database connection', 'draft')
      RETURNING id, topic, created_at
    `;

    console.log('✅ Data insertion successful!');
    console.log(`   Inserted post ID: ${insertResult[0].id}`);
    console.log(`   Topic: ${insertResult[0].topic}`);
    console.log(`   Created at: ${insertResult[0].created_at}`);

    // Test reading the data
    console.log('🔄 Testing data retrieval...');
    const posts = await sql`
      SELECT id, topic, idea, content, status, created_at 
      FROM posts 
      WHERE user_id = ${testUserId}
      ORDER BY created_at DESC
    `;

    console.log('✅ Data retrieval successful!');
    console.log(`   Found ${posts.length} posts for test user`);
    posts.forEach((post) => {
      console.log(`   - ${post.topic}: ${post.idea} (${post.status})`);
    });

    // Clean up test data
    console.log('🔄 Cleaning up test data...');
    await sql`DELETE FROM posts WHERE user_id = ${testUserId}`;
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Neon database connection test completed successfully!');
    console.log('Your Neon database is fully functional and ready for use.');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testConnection();
