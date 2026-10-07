import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTenant, listTenants, platformJson } from './platform-client';

describe('platform-client', () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
  });

  it('successfully fetches and parses json data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 'tenant-1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const tenants = await listTenants();
    expect(tenants).toEqual([{ id: 'tenant-1' }]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/platform/tenants', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store',
    }));
  });

  it('redirects to /sign-in?reason=expired when receiving 401 in browser', async () => {
    const assignMock = vi.fn();
    // Simulate browser window
    const mockWindow = {
      location: {
        pathname: '/tenants',
        search: '?page=1',
        assign: assignMock,
      },
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal('window', mockWindow);

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(platformJson('platform/tenants')).rejects.toThrow();
    expect(assignMock).toHaveBeenCalledWith(
      '/sign-in?reason=expired&next=' + encodeURIComponent('/tenants?page=1'),
    );

    vi.unstubAllGlobals();
  });

  it('throws descriptive error on non-ok responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Tenant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getTenant('missing')).rejects.toThrow('Tenant not found');
  });
});
