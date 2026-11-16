const test = require('node:test');
const assert = require('node:assert/strict');
const { simulate, FIRE } = require('../src/ca');
const { buildTerrain, FUEL } = require('../src/terrain');

const BBOX = { west: 30.40, east: 30.60, south: 50.40, north: 50.50 };
const N = 41;

// плоска ділянка з однаковим лісом
function flatTerrain() {
  const t = buildTerrain(BBOX, N, 1, [100, 100]);
  t.fuel.fill(FUEL.FOREST);
  t.elev.fill(100);
  return t;
}
const centre = (N >> 1) * N + (N >> 1);
const base = { ignitions: [centre], steps: 40, seed: 7, frameEvery: 5 };

function burnedBySide(result) {
  const last = result.frames[result.frames.length - 1].cells;
  let east = 0, west = 0;
  for (let i = 0; i < last.length; i++) {
    if (last[i] === String(FIRE.UNBURNED)) continue;
    const x = i % N;
    if (x > N >> 1) east++; else if (x < N >> 1) west++;
  }
  return { east, west };
}

test('однаковий seed дає однаковий результат', () => {
  const t = flatTerrain();
  const a = simulate({ ...base, terrain: t, wind: { u10: 5, v10: 0 }, rh: 30 });
  const b = simulate({ ...base, terrain: t, wind: { u10: 5, v10: 0 }, rh: 30 });
  assert.deepEqual(a.frames, b.frames);
  assert.deepEqual(a.series, b.series);
});

test('вітер витягує пожежу за напрямком (схід)', () => {
  const t = flatTerrain();
  let east = 0, west = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = burnedBySide(simulate({ ...base, seed, terrain: t, wind: { u10: 12, v10: 0 }, rh: 30 }));
    east += r.east; west += r.west;
  }
  assert.ok(east > west * 1.5, `схід ${east} має бути значно більшим за захід ${west}`);
});

test('вища вологість зменшує площу пожежі', () => {
  const t = flatTerrain();
  let dry = 0, wet = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    dry += simulate({ ...base, seed, terrain: t, wind: { u10: 0, v10: 0 }, rh: 20 }).summary.areaHa;
    wet += simulate({ ...base, seed, terrain: t, wind: { u10: 0, v10: 0 }, rh: 80 }).summary.areaHa;
  }
  assert.ok(dry > wet, `суха ${dry} має бути більшою за вологу ${wet}`);
});

test('вода не горить, а дані мають коректну структуру', () => {
  const t = flatTerrain();
  t.fuel[centre + 1] = FUEL.WATER;
  const r = simulate({ ...base, terrain: t, wind: { u10: 0, v10: 0 }, rh: 20 });
  assert.equal(r.frames.every((f) => f.cells[centre + 1] === '0'), true);
  assert.equal(r.frames[0].cells.length, N * N);
  assert.ok(r.summary.percent >= 0 && r.summary.percent <= 100);
});

test('вогонь швидше піднімається схилом, ніж спускається', () => {
  const hill = flatTerrain();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) hill.elev[y * N + x] = 100 + x * 20;   // підйом на схід
  let east = 0, west = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = burnedBySide(simulate({ ...base, seed, steps: 15, terrain: hill, wind: { u10: 0, v10: 0 }, rh: 40 }));
    east += r.east; west += r.west;
  }
  assert.ok(east > west, `угору ${east} має бути більше, ніж униз ${west}`);
});
