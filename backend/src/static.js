// Роздача зібраного Angular-застосунку: стиснення, кешування, ETag, захист шляху.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { pickEncoding, compress, MIN_BYTES } = require('./compress');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.map': 'application/json; charset=utf-8'
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.map']);
// файли з хешем у назві (main-ABCD1234.js) змінюються разом із вмістом, тому їх можна кешувати надовго
const HASHED = /[-.]([A-Z0-9]{8}|[0-9a-f]{16,20})\.(js|css|woff2|png|jpg|webp|svg)$/;

const cache = new Map();           // "файл|кодування" -> { mtimeMs, body }

async function body(file, stat, encoding) {
  const key = file + '|' + (encoding || 'identity');
  const hit = cache.get(key);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.body;
  const raw = await fs.promises.readFile(file);
  const out = encoding ? await compress(raw, encoding) : raw;
  cache.set(key, { mtimeMs: stat.mtimeMs, body: out });
  return out;
}

function statOrNull(file) {
  try { return fs.statSync(file); } catch { return null; }
}

/** Повертає true, якщо запит оброблено. */
async function serveStatic(req, res, pathname) {
  const root = config.STATIC_DIR;
  if (!fs.existsSync(root)) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { res.writeHead(400); res.end(); return true; }

  let file = path.join(root, decoded === '/' ? 'index.html' : decoded);
  if (file !== root && !file.startsWith(root + path.sep)) {       // захист від виходу за межі каталогу
    res.writeHead(403); res.end(); return true;
  }

  let stat = statOrNull(file);
  if (!stat || stat.isDirectory()) {
    if (path.extname(decoded)) return false;                      // відсутній файл із розширенням -> 404
    file = path.join(root, 'index.html');                          // маршрут застосунку -> index.html
    stat = statOrNull(file);
    if (!stat) return false;
  }

  const ext = path.extname(file).toLowerCase();
  const encoding = COMPRESSIBLE.has(ext) && stat.size > MIN_BYTES ? pickEncoding(req.headers['accept-encoding']) : null;
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}${encoding ? '-' + encoding : ''}"`;

  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': HASHED.test(path.basename(file)) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'ETag': etag,
    'Vary': 'Accept-Encoding',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  };

  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return true; }

  const data = await body(file, stat, encoding);
  if (encoding) headers['Content-Encoding'] = encoding;
  headers['Content-Length'] = data.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : data);
  return true;
}

module.exports = { serveStatic };
