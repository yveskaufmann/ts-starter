import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from './api-client';

function respond(body: string, init: ResponseInit) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, init)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('returns the JSON body', async () => {
    respond('{"status":"ok"}', { status: 200, headers: { 'Content-Type': 'application/json' } });

    await expect(api.get('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({ headers: expect.any(Headers) }));
  });

  it('throws an ApiError with the status for failed requests', async () => {
    respond('{"error":"nope"}', { status: 500, headers: { 'Content-Type': 'application/json' } });

    await expect(api.get('/health')).rejects.toMatchObject({ status: 500, body: { error: 'nope' } });
  });

  it('throws when the answer is not JSON, e.g. the SPA fallback', async () => {
    respond('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } });

    await expect(api.get('/health')).rejects.toBeInstanceOf(ApiError);
  });
});
