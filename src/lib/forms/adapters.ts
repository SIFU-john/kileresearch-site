import type { FormAdapter } from './types';

/** Default when no provider is chosen: always reports not-configured so the UI shows the mailto fallback. */
export const noneAdapter: FormAdapter = {
  id: 'none',
  async submit() {
    return { ok: false, reason: 'not-configured' };
  },
};

/**
 * Generic JSON POST. Works with most hosted form backends and with a small serverless
 * function of our own. Expects any 2xx response for success.
 */
export const httpPostAdapter: FormAdapter = {
  id: 'http-post',
  async submit(endpoint, kind, data) {
    if (!endpoint) return { ok: false, reason: 'not-configured' };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ form: kind, ...data }),
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
      return res.ok ? { ok: true } : { ok: false, reason: 'rejected', message: `HTTP ${res.status}` };
    } catch {
      return { ok: false, reason: 'network' };
    }
  },
};

export const adapters: Record<string, FormAdapter> = {
  [noneAdapter.id]: noneAdapter,
  [httpPostAdapter.id]: httpPostAdapter,
};
