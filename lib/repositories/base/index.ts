/**
 * Base Repository Infrastructure
 *
 * Exports all base repository components for easy importing.
 *
 * Usage:
 * ```typescript
 * import {
 *   BaseRepository,
 *   RepositoryContext,
 *   TransactionManager,
 *   executeTransaction
 * } from '@/lib/repositories/base';
 * ```
 */

// Repository Context
export {
  RepositoryContext,
  getRepositoryClient,
  type RepositoryContextType,
} from './repository-context';

// Base Repository
export {
  BaseRepository,
  RepositoryError,
  type QueryFilters,
  type PaginationOptions,
  type OrderOptions,
  type QueryOptions,
  type RepositoryResult,
} from './base-repository';

// Transaction Manager
export {
  TransactionManager,
  TransactionContext,
  transactionManager,
  executeTransaction,
  executeParallel,
  type TransactionCallback,
  type RollbackCallback,
} from './transaction-manager';
