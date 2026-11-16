const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

// імітація результату ng build у тимчасовому каталозі
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firesim-static-'));
const bigJs = 'console.log("FireSim");\n'.repeat(500);
fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>FireSim</title><app-root></app-root>' + ' '.repeat(2000));
fs.writeFileSync(path.join(dir, 'main-ABCD1234.js'), bigJs);
fs.writeFileSync(path.join(dir, 'favicon.ico'), 'ico');
process.env.STATIC_DIR = dir;
process.env.RUNS_FILE = path.join(dir, 'runs.json');
const server = require('../server');

let port;
test.before(async () => { await new Promise((r) => server.listen(0, r)); port = server.address().port; });
test.after(() => server.close());

// запит без автоматичного розпакування, щоб бачити сирі заголовки та тіло
function raw(pathname, headers = {}, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, path: pathname, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('головна сторінка не кешується назавжди й має захисні заголовки', async () => {
  const r = await raw('/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
});

test('файл із хешем кешується надовго й стискається (gzip)', async () => {
  const r = await raw('/main-ABCD1234.js', { 'Accept-Encoding': 'gzip' });
  assert.match(r.headers['cache-control'], /immutable/);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.equal(zlib.gunzipSync(r.body).toString(), bigJs);
  assert.ok(r.body.length < bigJs.length / 5);
});

test('Brotli має пріоритет, якщо його підтримує клієнт', async () => {
  const r = await raw('/main-ABCD1234.js', { 'Accept-Encoding': 'gzip, br' });
  assert.equal(r.headers['content-encoding'], 'br');
  assert.equal(zlib.brotliDecompressSync(r.body).toString(), bigJs);
});

test('умовний запит за ETag повертає 304 без тіла', async () => {
  const first = await raw('/main-ABCD1234.js', { 'Accept-Encoding': 'gzip' });
  const again = await raw('/main-ABCD1234.js', { 'Accept-Encoding': 'gzip', 'If-None-Match': first.headers.etag });
  assert.equal(again.status, 304);
  assert.equal(again.body.length, 0);
});

test('маршрут застосунку віддає index.html, а відсутній файл дає 404', async () => {
  const route = await raw('/simulator/results');
  assert.equal(route.status, 200);
  assert.match(route.body.toString(), /app-root/);
  assert.equal((await raw('/missing.js')).status, 404);
});

test('вихід за межі каталогу заборонено', async () => {
  const r = await raw('/..%2f..%2fetc%2fpasswd');
  assert.equal(r.status, 403);
  assert.doesNotMatch(r.body.toString(), /root:/);
});

test('JSON-відповіді API стискаються, дрібні лишаються як є', async () => {
  const big = await raw('/api/simulations', { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip' }, 'POST', JSON.stringify({ hourIndex: 1, seed: 3 }));
  assert.equal(big.status, 201);
  assert.equal(big.headers['content-encoding'], 'gzip');
  const json = JSON.parse(zlib.gunzipSync(big.body).toString());
  assert.ok(json.frames.length > 1);
  assert.ok(big.body.length < Buffer.byteLength(JSON.stringify(json)) / 4);   // істотно менше за оригінал

  const small = await raw('/api/health', { 'Accept-Encoding': 'gzip' });
  assert.equal(small.headers['content-encoding'], undefined);
});
