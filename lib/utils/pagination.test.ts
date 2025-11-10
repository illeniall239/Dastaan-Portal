import { describe, it, expect, vi } from 'vitest';
import {
  parsePaginationParams,
  calculatePaginationMeta,
  createPaginatedResponse,
  applyPaginationToQuery,
  applySortingToQuery,
  applyPagination,
  validatePaginationParams,
} from './pagination';
import { NextRequest } from 'next/server';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should parse default pagination parameters', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = parsePaginationParams(request);

      expect(params).toEqual({
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
    });

    it('should parse custom pagination parameters', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=3&limit=50&sortBy=title&sortOrder=asc');
      const params = parsePaginationParams(request);

      expect(params).toEqual({
        page: 3,
        limit: 50,
        sortBy: 'title',
        sortOrder: 'asc',
      });
    });

    it('should enforce maximum limit of 100', () => {
      const request = new NextRequest('http://localhost:3000/api/test?limit=200');
      const params = parsePaginationParams(request);

      expect(params.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const request = new NextRequest('http://localhost:3000/api/test?limit=0');
      const params = parsePaginationParams(request);

      expect(params.limit).toBe(1);
    });

    it('should enforce minimum page of 1', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=0');
      const params = parsePaginationParams(request);

      expect(params.page).toBe(1);
    });

    it('should handle negative page numbers', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=-5');
      const params = parsePaginationParams(request);

      expect(params.page).toBe(1);
    });

    it('should handle invalid page numbers by using NaN', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=invalid');
      const params = parsePaginationParams(request);

      // parseInt('invalid') returns NaN, Math.max(1, NaN) returns NaN
      expect(isNaN(params.page)).toBe(true);
    });

    it('should handle invalid limit values by using NaN', () => {
      const request = new NextRequest('http://localhost:3000/api/test?limit=invalid');
      const params = parsePaginationParams(request);

      // parseInt('invalid') returns NaN, Math.min/max with NaN returns NaN
      expect(isNaN(params.limit)).toBe(true);
    });

    it('should accept invalid sortOrder values as-is', () => {
      const request = new NextRequest('http://localhost:3000/api/test?sortOrder=invalid');
      const params = parsePaginationParams(request);

      // The implementation casts to 'asc' | 'desc' but doesn't validate at runtime
      // In TypeScript this is typed as 'asc' | 'desc' but accepts any string
      expect(params.sortOrder).toBe('invalid');
    });
  });

  describe('calculatePaginationMeta', () => {
    it('should create correct pagination metadata', () => {
      const meta = calculatePaginationMeta(1, 20, 100);

      expect(meta).toEqual({
        currentPage: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
        startIndex: 0,
        endIndex: 19,
      });
    });

    it('should handle last page correctly', () => {
      const meta = calculatePaginationMeta(5, 20, 100);

      expect(meta).toEqual({
        currentPage: 5,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
        startIndex: 80,
        endIndex: 99,
      });
    });

    it('should handle middle page correctly', () => {
      const meta = calculatePaginationMeta(3, 20, 100);

      expect(meta).toEqual({
        currentPage: 3,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
        startIndex: 40,
        endIndex: 59,
      });
    });

    it('should handle single page correctly', () => {
      const meta = calculatePaginationMeta(1, 20, 15);

      expect(meta).toEqual({
        currentPage: 1,
        pageSize: 20,
        totalItems: 15,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        startIndex: 0,
        endIndex: 14,
      });
    });

    it('should handle empty results', () => {
      const meta = calculatePaginationMeta(1, 20, 0);

      expect(meta).toEqual({
        currentPage: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startIndex: 0,
        endIndex: -1,
      });
    });

    it('should handle partial last page', () => {
      const meta = calculatePaginationMeta(3, 20, 55);

      expect(meta).toEqual({
        currentPage: 3,
        pageSize: 20,
        totalItems: 55,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
        startIndex: 40,
        endIndex: 54,
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a complete paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = createPaginatedResponse(data, 1, 20, 100);

      expect(response).toEqual({
        data,
        pagination: {
          currentPage: 1,
          pageSize: 20,
          totalItems: 100,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: false,
          startIndex: 0,
          endIndex: 19,
        },
      });
    });

    it('should handle empty data array', () => {
      const response = createPaginatedResponse([], 1, 20, 0);

      expect(response.data).toEqual([]);
      expect(response.pagination.totalItems).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
    });
  });

  describe('applyPaginationToQuery', () => {
    it('should apply pagination to query', () => {
      const mockQuery = {
        range: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 2,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      applyPaginationToQuery(mockQuery, params);

      // Page 2 with limit 20 should query range 20-39
      expect(mockQuery.range).toHaveBeenCalledWith(20, 39);
    });

    it('should calculate correct range for page 1', () => {
      const mockQuery = {
        range: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      applyPaginationToQuery(mockQuery, params);

      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('should calculate correct range for different page sizes', () => {
      const mockQuery = {
        range: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 3,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      applyPaginationToQuery(mockQuery, params);

      // Page 3 with limit 50 should query range 100-149
      expect(mockQuery.range).toHaveBeenCalledWith(100, 149);
    });
  });

  describe('applySortingToQuery', () => {
    it('should apply descending sort', () => {
      const mockQuery = {
        order: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      applySortingToQuery(mockQuery, params);

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply ascending sort', () => {
      const mockQuery = {
        order: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 1,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc' as const,
      };

      applySortingToQuery(mockQuery, params);

      expect(mockQuery.order).toHaveBeenCalledWith('title', { ascending: true });
    });
  });

  describe('applyPagination', () => {
    it('should apply both pagination and sorting', () => {
      const mockQuery = {
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 2,
        limit: 30,
        sortBy: 'updated_at',
        sortOrder: 'asc' as const,
      };

      applyPagination(mockQuery, params);

      expect(mockQuery.range).toHaveBeenCalledWith(30, 59);
      expect(mockQuery.order).toHaveBeenCalledWith('updated_at', { ascending: true });
    });

    it('should chain methods correctly', () => {
      const mockQuery = {
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      const params = {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      const result = applyPagination(mockQuery, params);

      expect(result).toBe(mockQuery);
      expect(mockQuery.range).toHaveBeenCalledBefore(mockQuery.order as any);
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate correct pagination parameters', () => {
      const params = {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      const result = validatePaginationParams(params);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject negative page number', () => {
      const params = { page: -1 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('page must be a positive integer');
    });

    it('should reject page number zero', () => {
      const params = { page: 0 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('page must be a positive integer');
    });

    it('should reject non-integer page number', () => {
      const params = { page: 1.5 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('page must be a positive integer');
    });

    it('should reject negative limit', () => {
      const params = { limit: -10 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be a positive integer');
    });

    it('should reject limit exceeding max', () => {
      const params = { limit: 150 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit cannot exceed 100');
    });

    it('should reject non-integer limit', () => {
      const params = { limit: 20.5 };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be a positive integer');
    });

    it('should reject invalid sortOrder', () => {
      const params = { sortOrder: 'invalid' as any };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("sortOrder must be 'asc' or 'desc'");
    });

    it('should return multiple errors for multiple invalid params', () => {
      const params = {
        page: -1,
        limit: 200,
        sortOrder: 'invalid' as any,
      };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('page must be a positive integer');
      expect(result.errors).toContain('limit cannot exceed 100');
      expect(result.errors).toContain("sortOrder must be 'asc' or 'desc'");
    });

    it('should allow valid optional parameters', () => {
      const params = {
        page: 5,
        limit: 50,
        sortOrder: 'asc' as const,
      };
      const result = validatePaginationParams(params);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
