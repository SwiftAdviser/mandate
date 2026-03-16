import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock @inertiajs/react
vi.mock('@inertiajs/react', () => ({
  usePage: vi.fn(() => ({ url: '/dashboard', props: { auth: { user: { id: 'test-user' } } } })),
  router: {
    get: vi.fn(),
    post: vi.fn(),
    reload: vi.fn(),
  },
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock CSS custom properties for tests
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Suppress fetch calls in tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response),
);
