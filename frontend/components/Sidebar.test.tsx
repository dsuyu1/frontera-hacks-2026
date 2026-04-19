import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/today' }));

vi.mock('@/lib/auth', () => ({
  AUTH_CHANGED_EVENT: 'frontera_auth_changed',
  getStoredUser: () => null,
  startLogin: () => {},
  startSignup: () => {},
  logout: () => {},
}));

vi.mock('@/lib/sources', () => ({
  SOURCES_CHANGED_EVENT: 'frontera_sources_changed',
  getFeedFolders: () => [],
  createFeedFolder: () => {},
  deleteFeedFolder: () => {},
}));

import Sidebar from './Sidebar';

describe('Sidebar', () => {
  test('includes Support Local tab', () => {
    render(<Sidebar open={true} onToggle={() => {}} />);
    expect(screen.getByText('Support Local')).toBeTruthy();
  });
});
