const config = require('./config');
const data = require('./datasets');
const { isFlammable } = require('./terrain');
const { simulate } = require('./ca');

class ValidationError extends Error {}

function validateIgnitions(list, terrain) {
  if (!Array.isArray(list) || list.length < 1 || list.length > config.MAX_IGNITIONS) {
    throw new ValidationError(`ignitions має містити від 1 до ${config.MAX_IGNITIONS} точок`);
  }
  const seen = new Set(), clean = [];
  for (const c of list) {
    const ok = c && Number.isInteger(c.x) && Number.isInteger(c.y)
      && c.x >= 0 && c.y >= 0 && c.x < terrain.size && c.y < terrain.size;
    if (!ok) throw new ValidationError('Координати точки мають бути цілими числами в межах сітки');
    if (!isFlammable(terrain.fuel[c.y * terrain.size + c.x])) {
      throw new ValidationError(`Клітина (${c.x}, ${c.y}) зайнята водою й не може горіти`);
    }
    const key = c.y * terrain.size + c.x;
    if (!seen.has(key)) { seen.add(key); clean.push({ x: c.x, y: c.y }); }
  }
  return clean;
}

function validate(body) {
  const hours = data.getWeather().hours;
  const hourIndex = body.hourIndex;
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex >= hours.length) {
    throw new ValidationError(`hourIndex має бути цілим числом від 0 до ${hours.length - 1}`);
  }
  const steps = body.steps === undefined ? config.DEFAULT_STEPS : body.steps;
  if (!Number.isInteger(steps) || steps < 10 || steps > config.MAX_STEPS) {
    throw new ValidationError(`steps має бути цілим числом від 10 до ${config.MAX_STEPS}`);
  }
  let seed = body.seed;
  if (seed === undefined) seed = Math.floor(Math.random() * 2 ** 31);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 32 - 1) {
    throw new ValidationError('seed має бути цілим невід’ємним числом');
  }
  const mapId = body.mapId === undefined ? 1 : body.mapId;
  if (!data.isMap(mapId)) throw new ValidationError('Невідомий номер карти');
  const terrain = data.getTerrain(mapId);
  // якщо точки не задано, використовуються гарячі точки FIRMS
  const ignitions = validateIgnitions(body.ignitions === undefined ? data.getFirmsCells(mapId) : body.ignitions, terrain);
  return { hourIndex, steps, seed, mapId, ignitions };
}

// Виконує симуляцію за параметрами; результат детермінований для однакового seed.
function run({ hourIndex, steps, seed, mapId, ignitions }) {
  const terrain = data.getTerrain(mapId);
  const hour = data.getWeather().hours[hourIndex];
  const cells = ignitions.map((c) => c.y * terrain.size + c.x);
  const frameEvery = Math.max(1, Math.ceil(steps / 60));
  const result = simulate({ terrain, ignitions: cells, wind: { u10: hour.u10, v10: hour.v10 }, rh: hour.rh, steps, seed, frameEvery });
  const speed = +Math.hypot(hour.u10, hour.v10).toFixed(1);
  return {
    params: { hourIndex, steps, seed, mapId, ignitions, time: hour.time, windSpeed: speed, u10: hour.u10, v10: hour.v10, rh: hour.rh },
    ...result
  };
}

module.exports = { validate, run, ValidationError };
