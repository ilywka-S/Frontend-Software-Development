const http = require('http');
const config = require('./src/config');
const { handle } = require('./src/router');

const server = http.createServer(handle);

if (require.main === module) {
  server.listen(config.PORT, () => console.log(`FireSim API: http://localhost:${config.PORT}/api/health`));
}

module.exports = server;
