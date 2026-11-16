// Доступ до наборів даних. Зараз дані беруться з JSON-файлів у каталозі data/
// у форматі NASA FIRMS та ECMWF ERA5. Щоб підключити реальні API, замініть
// тіла функцій getFirms() і getWeather(), зберігши структуру відповіді.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { buildTerrain, meanSlopeDeg, cellFromLatLon } = require('./terrain');

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(config.DATA_DIR, name), 'utf8'));

const firms = readJson('firms.json');
const weather = readJson('weather.json');
const ELEV_RANGE = [98, 187];

// кілька варіантів місцевості (карт), між якими перемикається інтерфейс
const terrains = {};
Object.entries(config.MAPS).forEach(([id, seed]) => {
  terrains[id] = buildTerrain(firms.bbox, config.GRID_SIZE, seed, ELEV_RANGE);
});

const isMap = (id) => Number.isInteger(id) && terrains[id] !== undefined;

module.exports = {
  isMap,
  mapIds: () => Object.keys(terrains).map(Number),
  getFirms: () => firms,
  getWeather: () => weather,
  getTerrain: (id = 1) => terrains[id],
  // гарячі точки FIRMS, переведені в клітини сітки (без повторів)
  getFirmsCells(id = 1) {
    const t = terrains[id], seen = new Set(), out = [];
    firms.points.forEach((p) => {
      const i = cellFromLatLon(t, p.latitude, p.longitude);
      if (!seen.has(i)) { seen.add(i); out.push({ x: i % t.size, y: Math.floor(i / t.size) }); }
    });
    return out;
  },
  getDem: (id = 1) => ({
    product: 'Copernicus DEM GLO-30 (синтетична модель для демонстрації)',
    resolution_m: 30,
    bbox: firms.bbox,
    elevation_min: ELEV_RANGE[0],
    elevation_max: ELEV_RANGE[1],
    mean_slope_deg: +meanSlopeDeg(terrains[id]).toFixed(2)
  })
};
