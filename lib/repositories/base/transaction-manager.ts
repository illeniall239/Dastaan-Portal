/**
 * Transaction Manager
 *
 * Manages multi-step operations with rollback support.
 *
 * Note: Supabase doesn't support client-side transactions, so this implements
 * a compensating transaction pattern where each operation tracks its rollback logic.
 *
 * Usage:
 * ```typescript
 * const txManager = new TransactionManager();
 *
 * try {
 *   await txManager.execute(async (tx) => {
 *     // Create user
 *     const user = await tx.track(
 *       userRepo.create(userData),
 *       (createdUser) => userRepo.delete(createdUser.id)
 *     );
 *
 *     // Create profile
 *     const profile = await tx.track(
 *       profileRepo.create({ userId: user.id, ...profileData }),
 *       (createdProfile) => profileRepo.delete(createdProfile.id)
 *     );
 *
 *     // Send notification (no rollback needed)
 *     await notificationService.send(user.id, 'Welcome!');
 *
 *     return { user, profile };
 *   });
 * } catch (error) {
 *   // Automatic rollback already executed
 *   console.error('Transaction failed:', error);
 * }
 * ```
 */

import { logger } from '@/lib/logger';
import { RepositoryError } from './base-repository';

/**
 * Transaction operation callback
 */
export type TransactionCallback<T> = () => Promise<T>;

/**
 * Rollback operation callback
 */
export type RollbackCallback<T> = (result: T) => Promise<void>;

/**
 * Transaction operation with rollback
 */
interface TransactionOperation<T = any> {
  id: string;
  name: string;
  result: T;
  rollback: RollbackCallback<T>;
  timestamp: Date;
}

/**
 * Transaction context for tracking operations
 */
export class TransactionContext {
  private operations: TransactionOperation[] = [];
  private rolledBack = false;

  /**
   * Track an operation with rollback logic
   *
   * @param operation - The operation to execute
   * @param rollback - Function to rollback the operation
   * @param name - Operation name for logging
   * @returns Operation result
   */
  async track<T>(
    operation: Promise<T> | TransactionCallback<T>,
    rollback: RollbackCallback<T>,
    name?: string
  ): Promise<T> {
    if (this.rolledBack) {
      throw new RepositoryError(
        'Cannot execute operations after rollback',
        'TRANSACTION_ROLLED_BACK'
      );
    }

    const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operationName = name || `Operation ${this.operations.length + 1}`;

    try {
      logger.info(`Executing transaction operation`);

      const result = typeof operation === 'function' ? await operation() : await operation;

      this.operations.push({
        id: operationId,
        name: operationName,
        result,
        rollback,
        timestamp: new Date(),
      });

      logger.info(`Transaction operation completed`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Transaction operation failed: ${operationName} - ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Rollback all tracked operations in reverse order
   */
  async rollback(): Promise<void> {
    if (this.rolledBack) {
      logger.warn('Transaction already rolled back');
      return;
    }

    this.rolledBack = true;

    logger.warn(`Rolling back transaction`);

    const errors: Error[] = [];

    // Rollback in reverse order (LIFO)
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const operation = this.operations[i];

      try {
        logger.info(`Rolling back operation`);
        await operation.rollback(operation.result);
        logger.info(`Operation rolled back successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Rollback failed for operation: ${operation.name} - ${errorMessage}`);

        errors.push(new Error(`Failed to rollback ${operation.name}: ${errorMessage}`));
      }
    }

    if (errors.length > 0) {
      logger.error(`Transaction rollback completed with errors`);
      throw new RepositoryError(
        'Transaction rollback completed with errors',
        'ROLLBACK_PARTIAL_FAILURE',
        { errors: errors.map(e => e.message) }
      );
    }

    logger.info(`Transaction rollback completed successfully`);
  }

  /**
   * Get the number of tracked operations
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Check if transaction has been rolled back
   */
  isRolledBack(): boolean {
    return this.rolledBack;
  }

  /**
   * Get all tracked operations (for debugging)
   */
  getOperations(): Readonly<TransactionOperation>[] {
    return [...this.operations];
  }
}

/**
 * Transaction manager for coordinating multi-step operations
 */
export class TransactionManager {
  /**
   * Execute a transaction with automatic rollback on error
   *
   * @param callback - Transaction callback with context
   * @returns Transaction result
   *
   * @example
   * ```typescript
   * const result = await txManager.execute(async (tx) => {
   *   const user = await tx.track(
   *     userRepo.create(userData),
   *     (u) => userRepo.delete(u.id),
   *     'Create user'
   *   );
   *
   *   const profile = await tx.track(
   *     profileRepo.create({ userId: user.id }),
   *     (p) => profileRepo.delete(p.id),
   *     'Create profile'
   *   );
   *
   *   return { user, profile };
   * });
   * ```
   */
  async execute<T>(
    callback: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    const context = new TransactionContext();
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`Starting transaction`);

    try {
      const result = await callback(context);

      logger.info(`Transaction ${transactionId} completed successfully with ${context.getOperationCount()} operations`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Transaction ${transactionId} failed (${context.getOperationCount()} operations), initiating rollback: ${errorMessage}`);

      try {
        await context.rollback();
      } catch (rollbackError) {
        const rollbackErrorMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        logger.error(`Rollback failed for transaction ${transactionId}: ${rollbackErrorMsg}`);

        // Rethrow rollback error with original error attached
        if (rollbackError instanceof RepositoryError) {
          throw new RepositoryError(
            `Transaction failed and rollback encountered errors: ${errorMessage}`,
            'TRANSACTION_AND_ROLLBACK_FAILED',
            {
              originalError: errorMessage,
              rollbackError: rollbackError.message,
              rollbackDetails: rollbackError.details
            }
          );
        }
      }

      // Rethrow original error after successful rollback
      throw error;
    }
  }

  /**
   * Execute multiple operations in parallel with coordinated rollback
   *
   * @param operations - Array of operations to execute
   * @returns Array of results
   *
   * @example
   * ```typescript
   * const [users, stories] = await txManager.executeParallel([
   *   {
   *     operation: () => userRepo.createMany(usersData),
   *     rollback: (users) => userRepo.deleteMany({ id: users.map(u => u.id) }),
   *     name: 'Create users'
   *   },
   *   {
   *     operation: () => storyRepo.createMany(storiesData),
   *     rollback: (stories) => storyRepo.deleteMany({ id: stories.map(s => s.id) }),
   *     name: 'Create stories'
   *   }
   * ]);
   * ```
   */
  async executeParallel<T extends any[]>(
    operations: Array<{
      operation: TransactionCallback<any>;
      rollback: RollbackCallback<any>;
      name?: string;
    }>
  ): Promise<T> {
    return this.execute(async (tx) => {
      // Execute all operations in parallel
      const results = await Promise.all(
        operations.map(({ operation, rollback, name }) =>
          tx.track(operation(), rollback, name)
        )
      );

      return results as T;
    });
  }

  /**
   * Create a savepoint for nested transactions
   *
   * @param callback - Nested transaction callback
   * @returns Transaction result
   *
   * @example
   * ```typescript
   * await txManager.execute(async (tx) => {
   *   const user = await tx.track(userRepo.create(userData), ...);
   *
   *   // Nested savepoint
   *   try {
   *     await txManager.savepoint(async (nestedTx) => {
   *       const profile = await nestedTx.track(profileRepo.create(...), ...);
   *       const settings = await nestedTx.track(settingsRepo.create(...), ...);
   *     });
   *   } catch (error) {
   *     // Savepoint rolled back, but main transaction continues
   *     logger.warn('Profile creation failed, continuing without profile');
   *   }
   *
   *   return user;
   * });
   * ```
   */
  async savepoint<T>(
    callback: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    // Savepoints work the same as regular transactions
    // Each has its own rollback scope
    return this.execute(callback);
  }
}

/**
 * Default transaction manager instance
 */
export const transactionManager = new TransactionManager();

/**
 * Helper function to execute a transaction
 *
 * @param callback - Transaction callback
 * @returns Transaction result
 *
 * @example
 * ```typescript
 * const result = await executeTransaction(async (tx) => {
 *   const user = await tx.track(
 *     userRepo.create(userData),
 *     (u) => userRepo.delete(u.id)
 *   );
 *   return user;
 * });
 * ```
 */
export async function executeTransaction<T>(
  callback: (context: TransactionContext) => Promise<T>
): Promise<T> {
  return transactionManager.execute(callback);
}

/**
 * Helper function to execute parallel operations
 *
 * @param operations - Array of operations
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const [users, stories] = await executeParallel([
 *   {
 *     operation: () => userRepo.createMany(usersData),
 *     rollback: (users) => Promise.all(users.map(u => userRepo.delete(u.id)))
 *   },
 *   {
 *     operation: () => storyRepo.createMany(storiesData),
 *     rollback: (stories) => Promise.all(stories.map(s => storyRepo.delete(s.id)))
 *   }
 * ]);
 * ```
 */
export async function executeParallel<T extends any[]>(
  operations: Array<{
    operation: TransactionCallback<any>;
    rollback: RollbackCallback<any>;
    name?: string;
  }>
): Promise<T> {
  return transactionManager.executeParallel<T>(operations);
}
