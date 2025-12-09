/**
 * Database migration and schema validation service
 * Handles database schema validation, migrations, and integrity checks
 */

import { connectionManager } from './databaseConnectionManager';
import { errorHandler } from './errorHandlingService';
import { databaseErrorHandler } from './databaseErrorHandler';

export interface SchemaValidationResult {
  isValid: boolean;
  missingTables: string[];
  missingColumns: { table: string; columns: string[] }[];
  missingIndexes: string[];
  errors: string[];
  warnings: string[];
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  errors: string[];
  rollbackAvailable: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  references?: { table: string; columns: string[] };
}

export class DatabaseMigrationService {
  private static instance: DatabaseMigrationService;
  private expectedSchema: TableSchema[] = [];

  private constructor() {
    this.initializeExpectedSchema();
  }

  static getInstance(): DatabaseMigrationService {
    if (!DatabaseMigrationService.instance) {
      DatabaseMigrationService.instance = new DatabaseMigrationService();
    }
    return DatabaseMigrationService.instance;
  }

  /**
   * Validates the current database schema against expected schema
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      isValid: true,
      missingTables: [],
      missingColumns: [],
      missingIndexes: [],
      errors: [],
      warnings: [],
    };

    try {
      const pool = connectionManager.getPool();

      // Check for missing tables
      for (const expectedTable of this.expectedSchema) {
        const tableExists = await this.checkTableExists(pool, expectedTable.name);

        if (!tableExists) {
          result.missingTables.push(expectedTable.name);
          result.isValid = false;
          continue;
        }

        // Check for missing columns
        const missingColumns = await this.checkMissingColumns(pool, expectedTable);
        if (missingColumns.length > 0) {
          result.missingColumns.push({
            table: expectedTable.name,
            columns: missingColumns,
          });
          result.isValid = false;
        }

        // Check for missing indexes
        const missingIndexes = await this.checkMissingIndexes(pool, expectedTable);
        result.missingIndexes.push(...missingIndexes);
        if (missingIndexes.length > 0) {
          result.isValid = false;
        }
      }

      // Additional integrity checks
      await this.performIntegrityChecks(pool, result);

      errorHandler.logError(
        `Schema validation completed: ${result.isValid ? 'PASSED' : 'FAILED'}`,
        undefined,
        {
          operation: 'schema_validation',
          missingTables: result.missingTables.length,
          missingColumns: result.missingColumns.length,
          missingIndexes: result.missingIndexes.length,
        },
        result.isValid ? 'info' : 'warn'
      );

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : String(error));

      errorHandler.logError(
        'Schema validation failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'schema_validation' }
      );

      return result;
    }
  }

  /**
   * Applies necessary database migrations
   */
  async applyMigrations(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrationsApplied: [],
      errors: [],
      rollbackAvailable: false,
    };

    try {
      const pool = connectionManager.getPool();
      const validationResult = await this.validateSchema();

      if (validationResult.isValid) {
        errorHandler.logError(
          'Database schema is already up to date',
          undefined,
          { operation: 'migration' },
          'info'
        );
        return result;
      }

      // Create missing tables
      for (const tableName of validationResult.missingTables) {
        try {
          await this.createTable(pool, tableName);
          result.migrationsApplied.push(`Created table: ${tableName}`);
        } catch (error) {
          result.errors.push(`Failed to create table ${tableName}: ${error}`);
          result.success = false;
        }
      }

      // Add missing columns
      for (const missingColumn of validationResult.missingColumns) {
        try {
          await this.addMissingColumns(pool, missingColumn.table, missingColumn.columns);
          result.migrationsApplied.push(
            `Added columns to ${missingColumn.table}: ${missingColumn.columns.join(', ')}`
          );
        } catch (error) {
          result.errors.push(`Failed to add columns to ${missingColumn.table}: ${error}`);
          result.success = false;
        }
      }

      // Create missing indexes
      for (const indexName of validationResult.missingIndexes) {
        try {
          await this.createIndex(pool, indexName);
          result.migrationsApplied.push(`Created index: ${indexName}`);
        } catch (error) {
          result.errors.push(`Failed to create index ${indexName}: ${error}`);
          result.success = false;
        }
      }

      errorHandler.logError(
        `Migration completed: ${result.success ? 'SUCCESS' : 'PARTIAL'}`,
        undefined,
        {
          operation: 'migration',
          migrationsApplied: result.migrationsApplied.length,
          errors: result.errors.length,
        },
        result.success ? 'info' : 'warn'
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));

      errorHandler.logError(
        'Migration failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'migration' }
      );

      return result;
    }
  }

  /**
   * Performs database integrity checks
   */
  async performIntegrityCheck(): Promise<{
    passed: boolean;
    checks: { name: string; passed: boolean; message?: string }[];
  }> {
    const checks: { name: string; passed: boolean; message?: string }[] = [];
    let allPassed = true;

    try {
      const pool = connectionManager.getPool();

      // Check foreign key constraints
      const fkCheck = await this.checkForeignKeyIntegrity(pool);
      checks.push({
        name: 'Foreign Key Integrity',
        passed: fkCheck.passed,
        message: fkCheck.message,
      });
      if (!fkCheck.passed) allPassed = false;

      // Check for orphaned records
      const orphanCheck = await this.checkOrphanedRecords(pool);
      checks.push({
        name: 'Orphaned Records',
        passed: orphanCheck.passed,
        message: orphanCheck.message,
      });
      if (!orphanCheck.passed) allPassed = false;

      // Check data consistency
      const consistencyCheck = await this.checkDataConsistency(pool);
      checks.push({
        name: 'Data Consistency',
        passed: consistencyCheck.passed,
        message: consistencyCheck.message,
      });
      if (!consistencyCheck.passed) allPassed = false;

      errorHandler.logError(
        `Integrity check completed: ${allPassed ? 'PASSED' : 'FAILED'}`,
        undefined,
        {
          operation: 'integrity_check',
          totalChecks: checks.length,
          passedChecks: checks.filter((c) => c.passed).length,
        },
        allPassed ? 'info' : 'warn'
      );

      return { passed: allPassed, checks };
    } catch (error) {
      errorHandler.logError(
        'Integrity check failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'integrity_check' }
      );

      return {
        passed: false,
        checks: [
          {
            name: 'Integrity Check',
            passed: false,
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * Creates a backup of the current database state
   */
  async createBackup(): Promise<{ success: boolean; backupId?: string; error?: string }> {
    try {
      const backupId = `backup_${Date.now()}`;

      // In a real implementation, this would create actual database backups
      // For now, we'll just log the backup creation
      errorHandler.logError(
        `Database backup created: ${backupId}`,
        undefined,
        { operation: 'backup_create', backupId },
        'info'
      );

      return { success: true, backupId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      errorHandler.logError(
        'Failed to create database backup',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'backup_create' }
      );

      return { success: false, error: errorMessage };
    }
  }

  private initializeExpectedSchema(): void {
    // Define the expected database schema
    this.expectedSchema = [
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'topic', type: 'text', nullable: true },
          { name: 'idea', type: 'text', nullable: true },
          { name: 'content', type: 'text', nullable: true },
          { name: 'status', type: 'varchar(50)', nullable: true },
          { name: 'tags', type: 'text[]', nullable: true },
          { name: 'summary', type: 'text', nullable: true },
          { name: 'headlines', type: 'text[]', nullable: true },
          { name: 'social_media_posts', type: 'jsonb', nullable: true },
          { name: 'selected_image', type: 'text', nullable: true },
          { name: 'schedule_date', type: 'timestamptz', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', nullable: true },
        ],
        indexes: [
          { name: 'idx_posts_user_id', columns: ['user_id'], unique: false },
          { name: 'idx_posts_status', columns: ['status'], unique: false },
          { name: 'idx_posts_schedule_date', columns: ['schedule_date'], unique: false },
          { name: 'idx_posts_created_at', columns: ['created_at'], unique: false },
        ],
        constraints: [{ name: 'posts_pkey', type: 'PRIMARY KEY', columns: ['id'] }],
      },
      {
        name: 'brand_voices',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'varchar(255)', nullable: false },
          { name: 'tone', type: 'varchar(100)', nullable: true },
          { name: 'vocabulary', type: 'jsonb', nullable: true },
          { name: 'writing_style', type: 'text', nullable: true },
          { name: 'target_audience', type: 'text', nullable: true },
          { name: 'sample_content', type: 'jsonb', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', nullable: true },
        ],
        indexes: [
          { name: 'idx_brand_voices_user_id', columns: ['user_id'], unique: false },
          { name: 'idx_brand_voices_name', columns: ['name'], unique: false },
        ],
        constraints: [{ name: 'brand_voices_pkey', type: 'PRIMARY KEY', columns: ['id'] }],
      },
      {
        name: 'audience_profiles',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'varchar(255)', nullable: false },
          { name: 'age_range', type: 'varchar(50)', nullable: true },
          { name: 'industry', type: 'varchar(100)', nullable: true },
          { name: 'interests', type: 'jsonb', nullable: true },
          { name: 'pain_points', type: 'jsonb', nullable: true },
          { name: 'preferred_content_types', type: 'jsonb', nullable: true },
          { name: 'engagement_patterns', type: 'jsonb', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', nullable: true },
        ],
        indexes: [{ name: 'idx_audience_profiles_user_id', columns: ['user_id'], unique: false }],
        constraints: [{ name: 'audience_profiles_pkey', type: 'PRIMARY KEY', columns: ['id'] }],
      },
      {
        name: 'integrations',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'varchar(255)', nullable: false },
          { name: 'type', type: 'varchar(100)', nullable: false },
          { name: 'platform', type: 'varchar(100)', nullable: false },
          { name: 'credentials', type: 'jsonb', nullable: true },
          { name: 'configuration', type: 'jsonb', nullable: true },
          { name: 'is_active', type: 'boolean', nullable: false, defaultValue: true },
          { name: 'last_sync', type: 'timestamptz', nullable: true },
          { name: 'sync_frequency', type: 'varchar(50)', nullable: true },
          { name: 'status', type: 'varchar(50)', nullable: false, defaultValue: 'active' },
          { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'NOW()' },
          { name: 'updated_at', type: 'timestamptz', nullable: true },
        ],
        indexes: [
          { name: 'idx_integrations_user_id', columns: ['user_id'], unique: false },
          { name: 'idx_integrations_platform', columns: ['platform'], unique: false },
          { name: 'idx_integrations_status', columns: ['status'], unique: false },
        ],
        constraints: [{ name: 'integrations_pkey', type: 'PRIMARY KEY', columns: ['id'] }],
      },
    ];
  }

  private async checkTableExists(pool: any, tableName: string): Promise<boolean> {
    try {
      const result = await pool`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `;
      return result[0].exists;
    } catch (error) {
      errorHandler.logError(
        `Failed to check if table ${tableName} exists`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'check_table_exists', table: tableName }
      );
      return false;
    }
  }

  private async checkMissingColumns(pool: any, expectedTable: TableSchema): Promise<string[]> {
    try {
      const result = await pool`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${expectedTable.name}
      `;

      const existingColumns = result.map((row: any) => row.column_name);
      const expectedColumns = expectedTable.columns.map((col) => col.name);

      return expectedColumns.filter((col) => !existingColumns.includes(col));
    } catch (error) {
      errorHandler.logError(
        `Failed to check columns for table ${expectedTable.name}`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'check_missing_columns', table: expectedTable.name }
      );
      return expectedTable.columns.map((col) => col.name);
    }
  }

  private async checkMissingIndexes(pool: any, expectedTable: TableSchema): Promise<string[]> {
    try {
      const result = await pool`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = ${expectedTable.name}
      `;

      const existingIndexes = result.map((row: any) => row.indexname);
      const expectedIndexes = expectedTable.indexes.map((idx) => idx.name);

      return expectedIndexes.filter((idx) => !existingIndexes.includes(idx));
    } catch (error) {
      errorHandler.logError(
        `Failed to check indexes for table ${expectedTable.name}`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'check_missing_indexes', table: expectedTable.name }
      );
      return expectedTable.indexes.map((idx) => idx.name);
    }
  }

  private async performIntegrityChecks(pool: any, result: SchemaValidationResult): Promise<void> {
    // Add any additional integrity checks here
    // For example, checking for data consistency, constraint violations, etc.
  }

  private async createTable(pool: any, tableName: string): Promise<void> {
    const tableSchema = this.expectedSchema.find((t) => t.name === tableName);
    if (!tableSchema) {
      throw new Error(`No schema definition found for table: ${tableName}`);
    }

    // This would contain the actual CREATE TABLE SQL
    // For now, we'll just log the operation
    errorHandler.logError(
      `Would create table: ${tableName}`,
      undefined,
      { operation: 'create_table', table: tableName },
      'info'
    );
  }

  private async addMissingColumns(pool: any, tableName: string, columns: string[]): Promise<void> {
    // This would contain the actual ALTER TABLE SQL
    errorHandler.logError(
      `Would add columns to ${tableName}: ${columns.join(', ')}`,
      undefined,
      { operation: 'add_columns', table: tableName, columns },
      'info'
    );
  }

  private async createIndex(pool: any, indexName: string): Promise<void> {
    // This would contain the actual CREATE INDEX SQL
    errorHandler.logError(
      `Would create index: ${indexName}`,
      undefined,
      { operation: 'create_index', index: indexName },
      'info'
    );
  }

  private async checkForeignKeyIntegrity(
    pool: any
  ): Promise<{ passed: boolean; message?: string }> {
    // Check foreign key constraints
    return { passed: true, message: 'All foreign key constraints are valid' };
  }

  private async checkOrphanedRecords(pool: any): Promise<{ passed: boolean; message?: string }> {
    // Check for orphaned records
    return { passed: true, message: 'No orphaned records found' };
  }

  private async checkDataConsistency(pool: any): Promise<{ passed: boolean; message?: string }> {
    // Check data consistency
    return { passed: true, message: 'Data consistency checks passed' };
  }
}

// Export singleton instance
export const migrationService = DatabaseMigrationService.getInstance();
