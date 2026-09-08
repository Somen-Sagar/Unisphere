import assert from 'node:assert/strict';
import test from 'node:test';

import { UniSphereApi, UniSphereApiError } from '../dist/index.js';

test('API client preserves fetch receiver and parses error responses', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = function receiverCheckedFetch(input, init) {
    if (this !== globalThis) {
      throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    }
    calls.push({ input: String(input), credentials: init?.credentials });
    return Promise.resolve(Response.json({ ok: true }));
  };

  try {
    const api = new UniSphereApi({
      baseUrl: 'https://api.unisphere.test/api/v1',
      credentials: 'include',
    });

    const result = await api.request('health');

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(calls, [
      {
        input: 'https://api.unisphere.test/api/v1/health',
        credentials: 'include',
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const unauthorizedApi = new UniSphereApi({
    baseUrl: 'https://api.unisphere.test/api/v1',
    fetchImplementation: () =>
      Promise.resolve(
        Response.json(
          { message: 'The email or password is incorrect.' },
          { status: 401 },
        ),
      ),
  });

  await assert.rejects(unauthorizedApi.login({ email: 'user@example.edu', password: 'bad' }), {
    name: 'UniSphereApiError',
    status: 401,
    message: 'The email or password is incorrect.',
  });

  const unavailableApi = new UniSphereApi({
    baseUrl: 'https://api.unisphere.test/api/v1',
    fetchImplementation: () =>
      Promise.resolve(
        Response.json(
          {
            code: 'BACKEND_UNAVAILABLE',
            message: 'UniSphere API is currently unavailable.',
          },
          { status: 503 },
        ),
      ),
  });

  await assert.rejects(
    unavailableApi.colleges(),
    (error) =>
      error instanceof UniSphereApiError &&
      error.status === 503 &&
      error.body?.code === 'BACKEND_UNAVAILABLE' &&
      error.message === 'UniSphere API is currently unavailable.',
  );
});
