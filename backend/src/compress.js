// Стиснення відповідей: Brotli (br) або gzip залежно від заголовка Accept-Encoding.
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);
const MIN_BYTES = 1024;           // дрібні відповіді стискати не варто

function pickEncoding(acceptEncoding = '') {
  const list = acceptEncoding.split(',').map((s) => s.trim().split(';')[0]);
  if (list.includes('br')) return 'br';
  if (list.includes('gzip')) return 'gzip';
  return null;
}

async function compress(buffer, encoding) {
  if (encoding === 'br') {
    return brotli(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } });
  }
  return gzip(buffer, { level: 6 });
}

module.exports = { pickEncoding, compress, MIN_BYTES };
