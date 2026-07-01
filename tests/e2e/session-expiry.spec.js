import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

/**
 * Integration coverage for real server-side session lifetime.
 *
 * The in-memory `sessions` store now stamps each login with an expiry and evicts
 * it once past TTL, and POST /api/auth/logout revokes a session server-side.
 * These tests exercise the *actual* expiry / revocation paths (not a fabricated
 * unknown token) by booting an isolated server with a tiny SESSION_TTL_MS on its
 * own port, so they never collide with the dev server on 3001.
 */

// Playwright runs from the workspace root, so a repo-relative path is enough.
const SERVER_ENTRY = 'server/index.js';
const TEST_PORT = 3999;
const TTL_MS = 1500;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let serverProc;

test.beforeAll(async () => {
  serverProc = spawn('node', [SERVER_ENTRY], {
    env: { ...process.env, NODE_ENV: 'development', SERVER_PORT: String(TEST_PORT), SESSION_TTL_MS: String(TTL_MS) },
    stdio: 'ignore',
  });

  // Wait for the server to accept connections.
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      const r = await fetch(`${BASE}/api/stats`);
      if (r.ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error('Test server did not start in time');
    await new Promise(res => setTimeout(res, 150));
  }
});

test.afterAll(() => {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
});

async function login(username, password) {
  const r = await fetch(`${BASE}/api/dealer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  expect(r.ok).toBeTruthy();
  const body = await r.json();
  return body.token;
}

function check(token) {
  return fetch(`${BASE}/api/auth/check`, { headers: { Authorization: `Bearer ${token}` } });
}

test.describe('Server-side session lifetime', () => {
  test('a token is accepted while fresh but rejected once its TTL has elapsed', async () => {
    const token = await login('admin', 'admin123');

    // Fresh token: /api/auth/check accepts it.
    const fresh = await check(token);
    expect(fresh.status).toBe(200);
    expect((await fresh.json()).valid).toBe(true);

    // Wait past the (short) TTL, then the same token must be rejected.
    await new Promise(res => setTimeout(res, TTL_MS + 500));

    const stale = await check(token);
    expect(stale.status).toBe(401);
    expect((await stale.json()).valid).toBe(false);
  });

  test('logout revokes the session server-side so the token stops working immediately', async () => {
    const token = await login('admin', 'admin123');

    const before = await check(token);
    expect(before.status).toBe(200);

    const out = await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(out.ok).toBeTruthy();

    // The token is dead the instant logout returns — no TTL wait needed.
    const after = await check(token);
    expect(after.status).toBe(401);
    expect((await after.json()).valid).toBe(false);
  });
});
