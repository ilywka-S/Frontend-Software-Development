const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// історія запусків у тимчасовому файлі, щоб не чіпати реальні дані
process.env.RUNS_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'firesim-')), 'runs.json');
const server = require('../server');

let base;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const post = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GET /api/health', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: 'ok' });
});

test('набори даних мають очікувану структуру', async () => {
  const firms = await (await fetch(base + '/api/datasets/firms')).json();
  assert.ok(firms.points.length > 0 && 'frp' in firms.points[0]);
  const weather = await (await fetch(base + '/api/datasets/weather')).json();
  assert.ok(weather.hours.length > 0 && 'u10' in weather.hours[0]);
  const dem = await (await fetch(base + '/api/datasets/dem')).json();
  assert.ok(dem.elevation_max > dem.elevation_min);
  const terrain = await (await fetch(base + '/api/terrain')).json();
  assert.equal(terrain.fuel.length, terrain.size * terrain.size);
});

test('POST /api/simulations створює, зберігає та відтворює запуск', async () => {
  const r = await post('/api/simulations', { hourIndex: 2, steps: 60, seed: 123 });
  assert.equal(r.status, 201);
  const run = await r.json();
  assert.ok(run.id && run.frames.length > 1 && run.series.length > 1);

  const list = await (await fetch(base + '/api/simulations')).json();
  assert.ok(list.some((x) => x.id === run.id));
  assert.equal(list[0].frames, undefined);               // у списку кадрів немає

  const replay = await (await fetch(`${base}/api/simulations/${run.id}`)).json();
  assert.deepEqual(replay.frames, run.frames);           // той самий seed - ті самі кадри

  const del = await fetch(`${base}/api/simulations/${run.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);
  assert.equal((await fetch(`${base}/api/simulations/${run.id}`)).status, 404);
});

test('некоректні параметри повертають 400', async () => {
  assert.equal((await post('/api/simulations', { hourIndex: 99 })).status, 400);
  assert.equal((await post('/api/simulations', { hourIndex: 1, steps: 5 })).status, 400);
  assert.equal((await post('/api/simulations', { hourIndex: 'a' })).status, 400);
  const bad = await fetch(base + '/api/simulations', { method: 'POST', body: '{не json' });
  assert.equal(bad.status, 400);
});

test('невідомий маршрут повертає 404', async () => {
  assert.equal((await fetch(base + '/api/nothing')).status, 404);
});

test('три карти відрізняються, а точки FIRMS переведено в клітини', async () => {
  const maps = [];
  for (const id of [1, 2, 3]) {
    const t = await (await fetch(`${base}/api/terrain?map=${id}`)).json();
    assert.equal(t.mapId, id);
    assert.ok(t.firmsCells.length > 0);
    maps.push(t.fuel);
  }
  assert.notEqual(maps[0], maps[1]);
  assert.notEqual(maps[1], maps[2]);
  assert.equal((await fetch(base + '/api/terrain?map=9')).status, 400);
});

test('симуляція з власними точками на вибраній карті відтворюється', async () => {
  const body = { hourIndex: 1, mapId: 2, seed: 5, steps: 40, ignitions: [{ x: 10, y: 10 }, { x: 11, y: 10 }] };
  const run = await (await post('/api/simulations', body)).json();
  assert.equal(run.params.mapId, 2);
  assert.deepEqual(run.params.ignitions, body.ignitions);
  const replay = await (await fetch(`${base}/api/simulations/${run.id}`)).json();
  assert.deepEqual(replay.frames, run.frames);
  assert.equal(run.frames[0].cells[10 * 60 + 10], '1');       // обрана клітина горить від початку
});

test('некоректні точки займання відхиляються', async () => {
  const terrain = await (await fetch(base + '/api/terrain?map=1')).json();
  const water = terrain.fuel.indexOf('0');
  const wx = water % terrain.size, wy = Math.floor(water / terrain.size);
  assert.equal((await post('/api/simulations', { hourIndex: 0, ignitions: [{ x: wx, y: wy }] })).status, 400);
  assert.equal((await post('/api/simulations', { hourIndex: 0, ignitions: [] })).status, 400);
  assert.equal((await post('/api/simulations', { hourIndex: 0, ignitions: [{ x: 99, y: 1 }] })).status, 400);
  assert.equal((await post('/api/simulations', { hourIndex: 0, mapId: 7 })).status, 400);
});
