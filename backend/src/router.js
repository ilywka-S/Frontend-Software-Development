const config = require('./config');
const data = require('./datasets');
const store = require('./runStore');
const sim = require('./simulationService');
const { serveStatic } = require('./static');
const { pickEncoding, compress, MIN_BYTES } = require('./compress');

async function send(req, res, status, payload) {
  let body = payload === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(payload));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Vary': 'Accept-Encoding'
  };
  const encoding = body.length > MIN_BYTES ? pickEncoding(req.headers['accept-encoding']) : null;
  if (encoding) { body = await compress(body, encoding); headers['Content-Encoding'] = encoding; }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > config.MAX_BODY_BYTES) { reject(new sim.ValidationError('Тіло запиту завелике')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new sim.ValidationError('Некоректний JSON')); }
    });
    req.on('error', reject);
  });
}

const FUEL_CHARS = (t) => Array.from(t.fuel).join('');
const mapParam = (url) => (url.searchParams.has('map') ? Number(url.searchParams.get('map')) : 1);
const publicRun = (r) => ({ id: r.id, createdAt: r.createdAt, params: r.params, summary: r.summary, series: r.series });

const routes = [
  ['GET', /^\/api\/health$/, () => [200, { status: 'ok' }]],
  ['GET', /^\/api\/datasets\/firms$/, () => [200, data.getFirms()]],
  ['GET', /^\/api\/datasets\/weather$/, () => [200, data.getWeather()]],
  ['GET', /^\/api\/datasets\/dem$/, (req, m, url) => {
    const id = mapParam(url);
    return data.isMap(id) ? [200, data.getDem(id)] : [400, { error: 'Невідомий номер карти' }];
  }],
  ['GET', /^\/api\/terrain$/, (req, m, url) => {
    const id = mapParam(url);
    if (!data.isMap(id)) return [400, { error: 'Невідомий номер карти' }];
    const t = data.getTerrain(id);
    return [200, {
      mapId: id, mapIds: data.mapIds(), size: t.size, bbox: t.bbox, cellAreaHa: +t.cellAreaHa.toFixed(2),
      fuel: FUEL_CHARS(t), firmsCells: data.getFirmsCells(id)
    }];
  }],
  ['GET', /^\/api\/simulations$/, () => [200, store.list().map(publicRun)]],
  ['POST', /^\/api\/simulations$/, async (req) => {
    const params = sim.validate(await readJson(req));
    const result = sim.run(params);
    const saved = store.add({ params: result.params, summary: result.summary, series: result.series });
    return [201, { ...publicRun(saved), frames: result.frames }];
  }],
  ['GET', /^\/api\/simulations\/([\w-]+)$/, (req, m) => {
    const rec = store.get(m[1]);
    if (!rec) return [404, { error: 'Запуск не знайдено' }];
    return [200, { ...publicRun(rec), frames: sim.run(sim.validate(rec.params)).frames }];   // відтворення за seed
  }],
  ['DELETE', /^\/api\/simulations\/([\w-]+)$/, (req, m) =>
    store.remove(m[1]) ? [204] : [404, { error: 'Запуск не знайдено' }]]
];

async function handle(req, res) {
  // CORS потрібен лише для режиму розробки без проксі
  res.setHeader('Access-Control-Allow-Origin', config.CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  try {
    if (!pathname.startsWith('/api')) {                       // усе, що не API, віддає зібраний фронтенд
      if (await serveStatic(req, res, pathname)) return;
      return send(req, res, 404, { error: 'Маршрут не знайдено' });
    }
    for (const [method, pattern, handler] of routes) {
      const m = pathname.match(pattern);
      if (m && req.method === method) {
        const [status, payload] = await handler(req, m, url);
        return send(req, res, status, payload);
      }
    }
    send(req, res, 404, { error: 'Маршрут не знайдено' });
  } catch (err) {
    if (err instanceof sim.ValidationError) return send(req, res, 400, { error: err.message });
    console.error(err);
    send(req, res, 500, { error: 'Внутрішня помилка сервера' });
  }
}

module.exports = { handle };
