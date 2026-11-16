// Ймовірнісний клітинний автомат поширення пожежі (окіл Мура, 8 сусідів).
//   Стани вогню:  0 - не горить, 1 - горить, 2 - згоріла
//   Перехід:      ГОРИТЬ -> ЗГОРІЛА після вигоряння палива (кілька кроків залежно від типу);
//                 для клітини, що може горіти: P = 1 - Π(1 - p_i),
//                 p_i = P_base * f(вітер) * f(схил) * f(вологість)
const { mulberry32 } = require('./rng');
const { FUEL, isFlammable } = require('./terrain');

const FIRE = { UNBURNED: 0, BURNING: 1, BURNED: 2 };
const P_BASE = { [FUEL.GRASS]: 0.33, [FUEL.FOREST]: 0.24, [FUEL.DENSE]: 0.17 };
// скільки кроків горить клітина: трава вигоряє швидко, густий ліс довго
const BURN_STEPS = { [FUEL.GRASS]: 2, [FUEL.FOREST]: 4, [FUEL.DENSE]: 6 };

// коефіцієнти впливу вітру та схилу (за мотивами моделей типу Alexandridis et al.)
const C1 = 0.045, C2 = 0.131, A_SLOPE = 0.078;

const NEIGHBORS = [];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) NEIGHBORS.push([dx, dy]);

function windToward(u10, v10) {          // вектор "куди дме вітер" в екранних координатах (y вниз)
  const speed = Math.hypot(u10, v10);
  return { speed, x: speed ? u10 / speed : 0, y: speed ? -v10 / speed : 0 };
}

function humidityFactor(rh) { return Math.max(0.1, 1 - rh / 100); }

function windFactor(speed, cosTheta) {
  return Math.exp(C1 * speed) * Math.exp(C2 * speed * (cosTheta - 1));
}

function slopeFactor(deltaElev, distM) {  // deltaElev > 0 - вогонь піднімається вгору
  const alpha = Math.atan(deltaElev / distM) * 180 / Math.PI;
  return Math.exp(A_SLOPE * alpha);
}

/**
 * @param {object} o
 *  terrain   - результат buildTerrain
 *  ignitions - індекси клітин початкового займання
 *  wind      - { u10, v10 } (м/с),  rh - відносна вологість (%)
 *  steps     - максимальна кількість кроків,  seed - зерно генератора
 *  frameEvery - зберігати кадр кожні N кроків
 */
function simulate({ terrain, ignitions, wind, rh, steps, seed, frameEvery = 1 }) {
  const { size, elev, fuel, cellW, cellH, cellAreaHa } = terrain;
  const rand = mulberry32(seed);
  const w = windToward(wind.u10, wind.v10);
  const hF = humidityFactor(rh);

  let flammable = 0;
  for (let i = 0; i < fuel.length; i++) if (isFlammable(fuel[i])) flammable++;

  let state = new Uint8Array(size * size);
  let burnLeft = new Uint8Array(size * size);          // скільки кроків клітині ще горіти
  ignitions.forEach((i) => {
    if (isFlammable(fuel[i])) { state[i] = FIRE.BURNING; burnLeft[i] = BURN_STEPS[fuel[i]]; }
  });

  const encode = (s) => { let out = ''; for (let i = 0; i < s.length; i++) out += s[i]; return out; };
  const statsOf = (s, step) => {
    let burning = 0, burned = 0;
    for (let i = 0; i < s.length; i++) { if (s[i] === FIRE.BURNING) burning++; else if (s[i] === FIRE.BURNED) burned++; }
    const touched = burning + burned;
    return {
      step, burning, burned,
      percent: +((touched / flammable) * 100).toFixed(1),
      areaHa: +(touched * cellAreaHa).toFixed(1)
    };
  };

  const series = [statsOf(state, 0)];
  const frames = [{ step: 0, cells: encode(state) }];

  for (let step = 1; step <= steps; step++) {
    const next = state.slice();
    const nextBurn = burnLeft.slice();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x, s = state[i];
        if (s === FIRE.BURNING) {
          nextBurn[i] = burnLeft[i] - 1;
          if (nextBurn[i] <= 0) next[i] = FIRE.BURNED;
          continue;
        }
        if (s !== FIRE.UNBURNED || !isFlammable(fuel[i])) continue;

        let stay = 1;
        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const ni = ny * size + nx;
          if (state[ni] !== FIRE.BURNING) continue;

          // напрямок поширення: від клітини, що горить, до поточної
          const sx = -dx, sy = -dy, len = Math.hypot(sx, sy);
          const cos = w.speed ? (sx * w.x + sy * w.y) / len : 0;
          const distM = Math.hypot(sx * cellW, sy * cellH);
          const p = Math.min(1, P_BASE[fuel[i]] * windFactor(w.speed, cos) * slopeFactor(elev[i] - elev[ni], distM) * hF);
          stay *= 1 - p;
        }
        if (stay < 1 && rand() < 1 - stay) { next[i] = FIRE.BURNING; nextBurn[i] = BURN_STEPS[fuel[i]]; }
      }
    }
    state = next; burnLeft = nextBurn;
    const st = statsOf(state, step);
    series.push(st);
    const last = st.burning === 0;
    if (step % frameEvery === 0 || last || step === steps) frames.push({ step, cells: encode(state) });
    if (last) break;
  }

  return { series, frames, summary: series[series.length - 1] };
}

module.exports = { simulate, FIRE, windFactor, slopeFactor, humidityFactor };
