// Синтетична цифрова модель висот і карта палива для ділянки.
// Для реальних даних замініть buildTerrain завантаженням Copernicus DEM GLO-30.
const { mulberry32 } = require('./rng');

const FUEL = { WATER: 0, GRASS: 1, FOREST: 2, DENSE: 3 };

function buildTerrain(bbox, size, seed, elevRange) {
  const rand = mulberry32(seed);
  const p = [rand() * 6, rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const raw = new Float32Array(size * size);
  let lo = Infinity, hi = -Infinity;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.sin(x / 9 + p[0]) * Math.cos(y / 11 + p[1]) + 0.5 * Math.sin((x + y) / 6 + p[2]);
      raw[y * size + x] = v;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
  }

  // параметри річки та озера залежать від зерна, тому кожна карта виглядає по-різному
  const riverBase = (0.45 + rand() * 0.4) * size;
  const riverTilt = (rand() - 0.5) * 0.6;
  const riverAmp = 3 + rand() * 3;
  const riverPeriod = 5 + rand() * 4;
  const fx = 4 + rand() * 4, fy = 4 + rand() * 4, rot = rand() * 0.8;     // розмір і нахил плям палива
  const lake = { x: size * (0.45 + rand() * 0.5), y: size * (0.1 + rand() * 0.8), r: 3 + rand() * 3 };

  const elev = new Float32Array(size * size);
  const fuel = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      elev[i] = elevRange[0] + ((raw[i] - lo) / (hi - lo)) * (elevRange[1] - elevRange[0]);

      const river = Math.abs(y - (riverBase + riverTilt * (x - size / 2) + riverAmp * Math.sin(x / riverPeriod + p[3]))) < 1.3
        || Math.hypot(x - lake.x, y - lake.y) < lake.r;
      const u = x * Math.cos(rot) - y * Math.sin(rot), v = x * Math.sin(rot) + y * Math.cos(rot);
      const patch = Math.sin(u / fx + p[4]) * Math.sin(v / fy + p[0]) + (rand() - 0.5) * 0.35;
      if (river) fuel[i] = FUEL.WATER;
      else if (patch > 0.5) fuel[i] = FUEL.GRASS;
      else if (patch < -0.5) fuel[i] = FUEL.DENSE;
      else fuel[i] = FUEL.FOREST;
    }
  }

  // фізичний розмір клітини
  const midLat = (bbox.north + bbox.south) / 2;
  const widthM = (bbox.east - bbox.west) * 111320 * Math.cos(midLat * Math.PI / 180);
  const heightM = (bbox.north - bbox.south) * 110574;
  const cellW = widthM / size, cellH = heightM / size;

  return { size, bbox, elev, fuel, cellW, cellH, cellAreaHa: (cellW * cellH) / 10000 };
}

function isFlammable(fuelCode) { return fuelCode !== FUEL.WATER; }

function meanSlopeDeg(t) {
  let sum = 0, n = 0;
  for (let y = 0; y < t.size - 1; y++) {
    for (let x = 0; x < t.size - 1; x++) {
      const i = y * t.size + x;
      const gx = (t.elev[i + 1] - t.elev[i]) / t.cellW;
      const gy = (t.elev[i + t.size] - t.elev[i]) / t.cellH;
      sum += Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI; n++;
    }
  }
  return sum / n;
}

// координати гарячої точки -> клітина сітки (найближча клітина, що може горіти)
function cellFromLatLon(t, lat, lon) {
  const b = t.bbox, n = t.size;
  let x = Math.floor(((lon - b.west) / (b.east - b.west)) * n);
  let y = Math.floor(((b.north - lat) / (b.north - b.south)) * n);
  x = Math.min(n - 1, Math.max(0, x)); y = Math.min(n - 1, Math.max(0, y));
  for (let r = 0; r < 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        if (isFlammable(t.fuel[ny * n + nx])) return ny * n + nx;
      }
    }
  }
  return y * n + x;
}

module.exports = { FUEL, buildTerrain, isFlammable, meanSlopeDeg, cellFromLatLon };
