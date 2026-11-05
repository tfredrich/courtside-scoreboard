import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('production build precaches its generated assets and supports offline navigation', async () => {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: root,
    stdio: 'pipe',
  });
  const output = new URL('../dist/', import.meta.url);
  const html = readFileSync(new URL('index.html', output), 'utf8');
  assert.match(html, /type="module"/);
  assert.match(html, /\.\/assets\/[^" ]+\.js/);
  assert.match(html, /\.\/assets\/[^" ]+\.css/);

  const handlers = new Map();
  const cachedFiles = [];
  const deletedCaches = [];
  const offlinePage = new Response('Offline scoreboard');
  let cacheName;
  const context = vm.createContext({
    URL,
    Response,
    fetch: async () => { throw new Error('Offline'); },
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (name, handler) => handlers.set(name, handler),
    },
    caches: {
      async open(name) {
        cacheName = name;
        return { async addAll(files) { cachedFiles.push(...files); } };
      },
      async keys() { return ['courtside-v3', cacheName, 'another-app']; },
      async delete(name) { deletedCaches.push(name); },
      async match(request) {
        return request === './index.html' ? offlinePage : undefined;
      },
    },
  });
  vm.runInContext(readFileSync(new URL('sw.js', output), 'utf8'), context);
  let pending;
  handlers.get('install')({ waitUntil(promise) { pending = promise; } });
  await pending;
  const expected = [
    './', './index.html', './icon.svg', './manifest.webmanifest',
    ...readdirSync(new URL('assets/', output)).map(file => `./assets/${file}`),
  ];
  assert.deepEqual([...cachedFiles].sort(), expected.sort());
  assert.match(cacheName, /^courtside-[a-f0-9]{12}$/);
  for (const file of cachedFiles.filter(file => file !== './')) {
    assert.ok(readFileSync(new URL(file, output)).length, `Missing cached asset: ${file}`);
  }

  handlers.get('activate')({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.deepEqual(deletedCaches, ['courtside-v3']);

  handlers.get('fetch')({
    request: { method: 'GET', url: 'https://example.test/scoreboard/', mode: 'navigate' },
    respondWith(promise) { pending = promise; },
  });
  assert.equal(await pending, offlinePage);
});
