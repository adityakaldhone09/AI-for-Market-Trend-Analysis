import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API mode contract failures', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reports an unconfigured base URL rather than switching to fixtures', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { marketService, dataMode } = await import('./service');
    expect(dataMode).toBe('api');
    await expect(marketService.markets()).rejects.toThrow(/VITE_API_BASE_URL is not configured/);
  });

  it('rejects invalid service payloads explicitly', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'x', name: 'Incomplete market' }],
      }),
    );
    vi.resetModules();
    const { marketService } = await import('./service');
    await expect(marketService.markets()).rejects.toThrow(/Response validation failed/);
  });
});
