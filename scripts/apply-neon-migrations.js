#!/usr/bin/env node

/**
 * Neon Database Migration Script
 *
 * This script applies database migrations to your Neon database.
 * It reads the migration files and executes them in order.
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database URL from environment variables
const databaseUrl = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    '❌ Error: No database URL found. Please set VITE_NEON_DATABASE_URL or DATABASE_URL environment variable.'
  );
  process.exit(1);
}

// Create database connection
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1, // Use single connection for migrations
  idle_timeout: 20,
  connect_timeout: 10,
});

async function applyMigrations() {
  try {
    console.log('🚀 Starting Neon database migrations...');

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'database',
      'neon-integration-schema-migration.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration file not found at ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Reading migration file...');
    console.log(`📁 Migration file: ${migrationPath}`);

    // Split the migration into individual statements
    // Remove comments and split by semicolon, but be careful with function definitions
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'))
      .filter((stmt) => !stmt.startsWith('COMMENT ON')); // Skip comments for now

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await sql.unsafe(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Some statements might fail if they already exist, which is okay
          if (
            error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation already exists')
          ) {
            console.log(
              `⚠️  Statement ${i + 1} skipped (already exists): ${error.message.split('\n')[0]}`
            );
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');

    // Verify the tables were created
    console.log('🔍 Verifying table creation...');

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'integration%'
      ORDER BY table_name
    `;

    console.log('📋 Created tables:');
    tables.forEach((table) => {
      console.log(`  ✅ ${table.table_name}`);
    });

    // Check if sample data was inserted
    const integrationCount = await sql`SELECT COUNT(*) as count FROM integrations`;
    console.log(`📊 Sample integrations: ${integrationCount[0].count}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migrations
applyMigrations().catch(console.error);
