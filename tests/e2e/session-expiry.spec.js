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

  test('a kept-warm token survives past the base TTL while an untouched one expires', async () => {
    // Both tokens are minted at (roughly) the same moment.
    const warm = await login('admin', 'admin123');
    const idle = await login('admin', 'admin123');

    // Poll the warm token several times, each within one TTL window, for a total
    // span well beyond the base TTL. Sliding renewal should keep it alive.
    const pollInterval = Math.floor(TTL_MS * 0.6);
    const polls = 4; // total elapsed ≈ 2.4 × TTL, past the base TTL
    for (let i = 0; i < polls; i++) {
      await new Promise(res => setTimeout(res, pollInterval));
      const r = await check(warm);
      expect(r.status).toBe(200);
      expect((await r.json()).valid).toBe(true);
    }

    // The idle token was never touched after login, so by now (> TTL elapsed)
    // it must have lapsed on the base idle timeout.
    const stale = await check(idle);
    expect(stale.status).toBe(401);
    expect((await stale.json()).valid).toBe(false);
  });

  test('sliding renewal cannot outlive the absolute max lifetime cap', async () => {
    // Spin up a dedicated server whose absolute cap is only slightly larger than
    // the idle TTL, so continuous activity still hits the hard ceiling.
    const capPort = TEST_PORT + 1;
    const capBase = `http://127.0.0.1:${capPort}`;
    const capTtl = 1000;
    const capMax = 1800; // hard ceiling, less than 2 × idle TTL
    const proc = spawn('node', [SERVER_ENTRY], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        SERVER_PORT: String(capPort),
        SESSION_TTL_MS: String(capTtl),
        SESSION_MAX_TTL_MS: String(capMax),
      },
      stdio: 'ignore',
    });

    try {
      const deadline = Date.now() + 10000;
      for (;;) {
        try {
          const r = await fetch(`${capBase}/api/stats`);
          if (r.ok) break;
        } catch {}
        if (Date.now() > deadline) throw new Error('Cap test server did not start in time');
        await new Promise(res => setTimeout(res, 150));
      }

      const loginRes = await fetch(`${capBase}/api/dealer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      });
      const token = (await loginRes.json()).token;

      // Keep polling within each idle window. Even though it's continuously warm,
      // the session must die once the absolute cap (capMax) is passed.
      const started = Date.now();
      let sawExpiry = false;
      while (Date.now() - started < capMax + 800) {
        await new Promise(res => setTimeout(res, Math.floor(capTtl * 0.6)));
        const r = await fetch(`${capBase}/api/auth/check`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) { sawExpiry = true; break; }
      }
      expect(sawExpiry).toBe(true);
    } finally {
      if (proc && !proc.killed) proc.kill('SIGTERM');
    }
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
