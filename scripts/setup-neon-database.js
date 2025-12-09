import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔄 Connecting to Neon database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 1, // Use single connection for setup
});

async function setupDatabase() {
  try {
    console.log('✅ Connected to Neon database');

    // Read and execute schema
    const schemaPath = join(__dirname, '..', 'database', 'neon-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    console.log('🔄 Applying database schema...');
    await sql.unsafe(schema);

    console.log('✅ Database schema applied successfully');

    // Test the connection
    console.log('🔄 Testing database connection...');
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    console.log('✅ Database test successful:');
    console.log(`   Current time: ${result[0].current_time}`);
    console.log(`   PostgreSQL version: ${result[0].postgres_version}`);

    // Test a simple query
    console.log('🔄 Testing table creation...');
    const tableResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log('✅ Tables created successfully:');
    tableResult.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎉 Neon database setup completed successfully!');
    console.log('Your database is ready to use with your application.');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase();
