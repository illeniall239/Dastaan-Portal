import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((callback) => callback({ data: [], error: null })),
    })),
  }),
}));

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((callback) => callback({ data: [], error: null })),
    })),
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN = 'geo.com';
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@geo.com',
  role: 'content_manager',
  full_name: 'Test User',
  department: 'Content',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockStory = {
  id: 'test-story-id',
  story_id: 'ST-2025-0001',
  title: 'Test Story',
  genre: 'Drama',
  status: 'submitted',
  submitted_by: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockCallReport = {
  id: 'test-call-report-id',
  call_report_id: 'CR-2025-0001',
  story_id: mockStory.id,
  meeting_date: new Date().toISOString(),
  attendees: ['Test User'],
  discussion_summary: 'Test discussion',
  created_by: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Custom render function with providers (can be extended as needed)
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here if needed (e.g., initial route, user context)
}

export function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, { ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
