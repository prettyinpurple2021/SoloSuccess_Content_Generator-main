const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function checkExistingPolicies() {
  try {
    console.log('Checking existing RLS policies...\n');

    const policies = await sql`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies 
      WHERE tablename = 'posts'
    `;

    console.log('Existing posts table policies:');
    policies.forEach((policy) => {
      console.log(`- Policy: ${policy.policyname}`);
      console.log(`  Table: ${policy.tablename}`);
      console.log(`  Command: ${policy.cmd}`);
      console.log(`  Condition: ${policy.qual}`);
      console.log('');
    });

    // Check RLS status
    const rlsStatus = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename IN ('posts', 'brand_voices', 'audience_profiles', 'campaigns', 'content_series')
      AND schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('Current RLS Status:');
    rlsStatus.forEach((table) => {
      console.log(`- ${table.tablename}: ${table.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
  }
}

checkExistingPolicies();
