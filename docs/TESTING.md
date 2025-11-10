# Testing Guide

This document provides comprehensive guidelines for testing the Dastaan Portal application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Code Coverage](#code-coverage)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

The Dastaan Portal uses **Vitest** as the test runner and **React Testing Library** for component testing. Our testing philosophy emphasizes:

- **Testing user behavior** over implementation details
- **Integration tests** over isolated unit tests
- **Accessibility-first** queries (screen readers, labels)
- **40% code coverage** target initially

## Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Test runner (Vite-powered, fast) | 4.x |
| **@testing-library/react** | React component testing | 16.x |
| **@testing-library/jest-dom** | Custom DOM matchers | 6.x |
| **@testing-library/user-event** | User interaction simulation | 14.x |
| **jsdom** | DOM environment for Node.js | 27.x |

## Running Tests

### Command Reference

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Interactive UI mode
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Coverage Reports

Coverage reports are generated in:
- **Terminal**: Text summary
- **HTML**: `coverage/index.html` (open in browser)
- **JSON**: `coverage/coverage-final.json`

**Current Coverage Target**: 40% (lines, functions, branches, statements)

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/tests/setup';

describe('ComponentName', () => {
  beforeEach(() => {
    // Reset state before each test
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### File Naming Convention

- **Test files**: Place next to the file being tested
- **Naming**: `filename.test.ts` or `filename.spec.ts`
- **Extensions**: `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`

**Examples:**
```
lib/utils/pagination.ts       → lib/utils/pagination.test.ts
components/ui/button.tsx      → components/ui/button.test.tsx
app/api/stories/route.ts      → app/api/stories/route.test.ts
```

## Test Organization

### Directory Structure

```
project-root/
├── tests/
│   └── setup.ts              # Global test setup
├── lib/
│   ├── utils/
│   │   ├── pagination.ts
│   │   └── pagination.test.ts
│   └── rate-limit-redis.ts
│       └── rate-limit-redis.test.ts
├── components/
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx
└── vitest.config.ts          # Vitest configuration
```

### Test Categories

1. **Unit Tests**: Test individual functions/utilities
2. **Component Tests**: Test React components in isolation
3. **Integration Tests**: Test component interactions
4. **API Route Tests**: Test Next.js API endpoints

## Code Coverage

### Configuration

Coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    '.next/',
    'tests/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData',
    'dist/',
  ],
  lines: 40,
  functions: 40,
  branches: 40,
  statements: 40,
}
```

### Excluded from Coverage

- Configuration files (`*.config.ts`, `*.config.js`)
- Type definitions (`*.d.ts`)
- Mock data directories
- Build output (`.next/`, `dist/`)
- Test files themselves

## Best Practices

### 1. Test User Behavior, Not Implementation

❌ **Bad** (testing implementation):
```typescript
it('should set isOpen state to true', () => {
  const { result } = renderHook(() => useState(false));
  act(() => result.current[1](true));
  expect(result.current[0]).toBe(true);
});
```

✅ **Good** (testing behavior):
```typescript
it('should show modal when button is clicked', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('button', { name: /open/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

### 2. Use Accessible Queries

**Query Priority** (from most to least preferred):
1. `getByRole` - Accessibility-first
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Inputs
4. `getByText` - Non-interactive content
5. `getByTestId` - Last resort only

✅ **Good**:
```typescript
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
```

❌ **Avoid**:
```typescript
screen.getByTestId('submit-button')
```

### 3. Async Testing

Always use `async`/`await` with user interactions:

```typescript
it('should handle form submission', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@geo.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalled();
});
```

### 4. Mock External Dependencies

**Supabase Client**:
```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }),
}));
```

**Next.js Router**:
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));
```

### 5. Test Error States

Always test both success and error scenarios:

```typescript
describe('fetchStories', () => {
  it('should return stories on success', async () => {
    const stories = await fetchStories();
    expect(stories).toHaveLength(3);
  });

  it('should handle errors gracefully', async () => {
    // Mock error condition
    vi.mocked(supabase.from).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchStories()).rejects.toThrow('Network error');
  });
});
```

## Common Patterns

### Testing Pagination

```typescript
import { parsePaginationParams, createPaginatedResponse } from '@/lib/utils/pagination';

it('should parse pagination parameters', () => {
  const request = new NextRequest('http://localhost/api/test?page=2&limit=50');
  const params = parsePaginationParams(request);

  expect(params.page).toBe(2);
  expect(params.limit).toBe(50);
});
```

### Testing Rate Limiting

```typescript
import { getClientIdentifier } from '@/lib/rate-limit-redis';

it('should extract client IP from headers', () => {
  const request = new Request('http://localhost/api/test', {
    headers: { 'x-forwarded-for': '192.168.1.100' },
  });

  const identifier = getClientIdentifier(request);
  expect(identifier).toBe('192.168.1.100');
});
```

### Testing Components with Forms

```typescript
import { render, screen } from '@/tests/setup';
import userEvent from '@testing-library/user-event';

it('should validate email format', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'invalid-email');
  await user.tab(); // Trigger blur validation

  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

### Testing API Routes

```typescript
import { GET } from './route';
import { NextRequest } from 'next/server';

it('should return paginated stories', async () => {
  const request = new NextRequest('http://localhost/api/stories?page=1&limit=20');
  const response = await GET(request);
  const data = await response.json();

  expect(data.pagination.currentPage).toBe(1);
  expect(data.data).toBeInstanceOf(Array);
});
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Problem**: Module resolution issues
**Solution**: Check `vitest.config.ts` path alias:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

#### 2. "window is not defined"

**Problem**: Server-side code accessing browser APIs
**Solution**: Mock the browser API or use `jsdom` environment:
```typescript
// In test file
/**
 * @vitest-environment jsdom
 */
```

#### 3. Async tests timing out

**Problem**: Forgot `await` on async operations
**Solution**: Always use `await`:
```typescript
await user.click(button);  // ✅
user.click(button);         // ❌
```

#### 4. Mock not working

**Problem**: Mock defined after import
**Solution**: Move `vi.mock()` to top of file:
```typescript
// ✅ Correct order
vi.mock('@/lib/supabase/client');
import { createClient } from '@/lib/supabase/client';

// ❌ Wrong order
import { createClient } from '@/lib/supabase/client';
vi.mock('@/lib/supabase/client');
```

### Debug Mode

Run tests with verbose output:
```bash
npm test -- --reporter=verbose
```

View test UI for interactive debugging:
```bash
npm run test:ui
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next Steps

1. **Increase coverage**: Gradually raise from 40% to 60%+
2. **E2E tests**: Add Playwright for end-to-end testing
3. **Visual regression**: Consider Chromatic/Percy
4. **Performance tests**: Add benchmarks for critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about#priority)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2025-11-09
**Version**: 1.0.0
