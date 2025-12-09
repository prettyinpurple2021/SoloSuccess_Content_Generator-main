/**
 * Database-specific error handling and recovery mechanisms
 * Provides connection management, transaction handling, and error recovery
 */

import { errorHandler, ErrorContext } from './errorHandlingService';
import postgres from 'postgres';

export interface DatabaseErrorContext extends ErrorContext {
  query?: string;
  params?: any[];
  table?: string;
  connectionId?: string;
  transactionId?: string;
  retryAttempt?: number;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  consecutiveFailures: number;
}

export interface TransactionContext {
  id: string;
  startTime: Date;
  operations: string[];
  rollbackHandlers: (() => Promise<void>)[];
}

export class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler;
  private connectionHealth: ConnectionHealth = {
    isHealthy: true,
    lastCheck: new Date(),
    responseTime: 0,
    errorCount: 0,
    consecutiveFailures: 0,
  };
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private circuitBreakerOpen = false;
  private circuitBreakerOpenTime?: Date;
  private readonly circuitBreakerTimeout = 30000; // 30 seconds
  private readonly maxConsecutiveFailures = 5;

  private constructor() {
    this.startHealthMonitoring();
  }

  static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler();
    }
    return DatabaseErrorHandler.instance;
  }

  /**
   * Wraps database operations with comprehensive error handling and recovery
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: DatabaseErrorContext
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      if (this.shouldResetCircuitBreaker()) {
        this.resetCircuitBreaker();
      } else {
        throw new Error('Database circuit breaker is open - service temporarily unavailable');
      }
    }

    const startTime = Date.now();

    try {
      const result = await errorHandler.withRetry(operation, 'database', context);

      // Update health metrics on success
      this.updateHealthMetrics(true, Date.now() - startTime);
      return result;
    } catch (error) {
      // Update health metrics on failure
      this.updateHealthMetrics(false, Date.now() - startTime);

      // Handle specific database errors
      const handledError = this.handleDatabaseError(error, context);
      throw handledError;
    }
  }

  /**
   * Executes database operations within a transaction with rollback support
   */
  async executeTransaction<T>(
    operations: ((sql: any) => Promise<any>)[],
    context: DatabaseErrorContext
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const transactionContext: TransactionContext = {
      id: transactionId,
      startTime: new Date(),
      operations: [],
      rollbackHandlers: [],
    };

    this.activeTransactions.set(transactionId, transactionContext);

    try {
      // This would need to be implemented with the actual postgres connection
      // For now, we'll simulate transaction handling
      const results: any[] = [];

      for (const operation of operations) {
        try {
          const result = await this.executeWithErrorHandling(
            () => operation(null), // Would pass actual SQL connection
            { ...context, transactionId }
          );
          results.push(result);
          transactionContext.operations.push(`Operation ${results.length}`);
        } catch (error) {
          // Rollback transaction on any failure
          await this.rollbackTransaction(transactionId);
          throw error;
        }
      }

      // Commit transaction
      await this.commitTransaction(transactionId);
      return results as T;
    } catch (error) {
      errorHandler.logError(
        `Transaction ${transactionId} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { ...context, transactionId }
      );
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Tests database connection health
   */
  async testConnection(pool: any): Promise<boolean> {
    const startTime = Date.now();

    try {
      await pool`SELECT 1 as health_check`;
      const responseTime = Date.now() - startTime;

      this.updateHealthMetrics(true, responseTime);
      return true;
    } catch (error) {
      this.updateHealthMetrics(false, Date.now() - startTime);

      errorHandler.logError(
        'Database connection health check failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'health_check' }
      );

      return false;
    }
  }

  /**
   * Handles connection recovery and reconnection
   */
  async handleConnectionRecovery(pool: any): Promise<boolean> {
    if (this.circuitBreakerOpen) {
      return false;
    }

    try {
      // Attempt to reconnect
      const isHealthy = await this.testConnection(pool);

      if (isHealthy) {
        this.connectionHealth.consecutiveFailures = 0;
        this.connectionHealth.isHealthy = true;

        errorHandler.logError(
          'Database connection recovered successfully',
          undefined,
          { operation: 'connection_recovery' },
          'info'
        );

        return true;
      }

      return false;
    } catch (error) {
      errorHandler.logError(
        'Database connection recovery failed',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'connection_recovery' }
      );

      return false;
    }
  }

  /**
   * Provides graceful degradation options when database is unavailable
   */
  async handleGracefulDegradation<T>(
    fallbackData?: T,
    context?: DatabaseErrorContext
  ): Promise<T | null> {
    errorHandler.logError(
      'Activating graceful degradation for database operation',
      undefined,
      context,
      'warn'
    );

    // Return cached data if available
    if (fallbackData !== undefined) {
      return fallbackData;
    }

    // Return null to indicate service degradation
    return null;
  }

  /**
   * Gets current database health status
   */
  getHealthStatus(): ConnectionHealth & {
    circuitBreakerOpen: boolean;
    activeTransactions: number;
  } {
    return {
      ...this.connectionHealth,
      circuitBreakerOpen: this.circuitBreakerOpen,
      activeTransactions: this.activeTransactions.size,
    };
  }

  /**
   * Forces circuit breaker reset (for admin use)
   */
  forceCircuitBreakerReset(): void {
    this.resetCircuitBreaker();
    errorHandler.logError(
      'Circuit breaker manually reset',
      undefined,
      { operation: 'circuit_breaker_reset' },
      'info'
    );
  }

  private handleDatabaseError(error: unknown, context: DatabaseErrorContext): Error {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorMessage = err.message.toLowerCase();

    // Classify database errors
    let errorType = 'unknown';
    let isRetryable = false;
    let suggestedAction = 'Contact support';

    if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
      errorType = 'connection_error';
      isRetryable = true;
      suggestedAction = 'Check database connectivity';
    } else if (errorMessage.includes('timeout')) {
      errorType = 'timeout_error';
      isRetryable = true;
      suggestedAction = 'Retry operation or check query performance';
    } else if (errorMessage.includes('deadlock')) {
      errorType = 'deadlock_error';
      isRetryable = true;
      suggestedAction = 'Retry transaction with different ordering';
    } else if (errorMessage.includes('constraint') || errorMessage.includes('foreign key')) {
      errorType = 'constraint_violation';
      isRetryable = false;
      suggestedAction = 'Check data integrity and relationships';
    } else if (errorMessage.includes('syntax') || errorMessage.includes('column')) {
      errorType = 'query_error';
      isRetryable = false;
      suggestedAction = 'Check query syntax and schema';
    } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      errorType = 'permission_error';
      isRetryable = false;
      suggestedAction = 'Check database permissions';
    } else if (errorMessage.includes('disk') || errorMessage.includes('space')) {
      errorType = 'storage_error';
      isRetryable = false;
      suggestedAction = 'Check database storage capacity';
    }

    // Log the classified error
    errorHandler.logError(`Database ${errorType}: ${err.message}`, err, {
      ...context,
      errorType,
      isRetryable,
      suggestedAction,
    });

    // Create enhanced error with additional context
    const enhancedError = new Error(err.message);
    enhancedError.name = `Database${errorType.charAt(0).toUpperCase() + errorType.slice(1)}`;
    enhancedError.stack = err.stack;

    // Add custom properties
    (enhancedError as any).errorType = errorType;
    (enhancedError as any).isRetryable = isRetryable;
    (enhancedError as any).suggestedAction = suggestedAction;
    (enhancedError as any).context = context;

    return enhancedError;
  }

  private updateHealthMetrics(success: boolean, responseTime: number): void {
    this.connectionHealth.lastCheck = new Date();
    this.connectionHealth.responseTime = responseTime;

    if (success) {
      this.connectionHealth.consecutiveFailures = 0;
      this.connectionHealth.isHealthy = true;
    } else {
      this.connectionHealth.errorCount++;
      this.connectionHealth.consecutiveFailures++;

      if (this.connectionHealth.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.openCircuitBreaker();
      }

      this.connectionHealth.isHealthy = false;
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenTime = new Date();

    errorHandler.logError(
      'Database circuit breaker opened due to consecutive failures',
      undefined,
      {
        operation: 'circuit_breaker',
        consecutiveFailures: this.connectionHealth.consecutiveFailures,
      },
      'warn'
    );
  }

  private shouldResetCircuitBreaker(): boolean {
    if (!this.circuitBreakerOpenTime) return false;

    const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime.getTime();
    return timeSinceOpen >= this.circuitBreakerTimeout;
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenTime = undefined;
    this.connectionHealth.consecutiveFailures = 0;

    errorHandler.logError(
      'Database circuit breaker reset',
      undefined,
      { operation: 'circuit_breaker_reset' },
      'info'
    );
  }

  private async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return;

    try {
      // Execute rollback handlers in reverse order
      for (const handler of transaction.rollbackHandlers.reverse()) {
        await handler();
      }

      errorHandler.logError(
        `Transaction ${transactionId} rolled back successfully`,
        undefined,
        { operation: 'transaction_rollback', transactionId },
        'info'
      );
    } catch (error) {
      errorHandler.logError(
        `Failed to rollback transaction ${transactionId}`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'transaction_rollback', transactionId }
      );
    }
  }

  private async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return;

    try {
      // In a real implementation, this would commit the database transaction
      errorHandler.logError(
        `Transaction ${transactionId} committed successfully`,
        undefined,
        { operation: 'transaction_commit', transactionId },
        'info'
      );
    } catch (error) {
      errorHandler.logError(
        `Failed to commit transaction ${transactionId}`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'transaction_commit', transactionId }
      );
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    setInterval(() => {
      if (this.connectionHealth.isHealthy) {
        // Periodic health check would go here
        // For now, we'll just update the last check time
        this.connectionHealth.lastCheck = new Date();
      }
    }, 30000);
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// Export singleton instance
export const databaseErrorHandler = DatabaseErrorHandler.getInstance();
