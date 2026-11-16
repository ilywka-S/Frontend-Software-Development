const path = require('path');

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  // Джерело дозволених запитів у режимі розробки (Angular dev-server)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',
  DATA_DIR: path.join(__dirname, '..', 'data'),
  RUNS_FILE: process.env.RUNS_FILE || path.join(__dirname, '..', 'data', 'runs.json'),
  // каталог зібраного фронтенду (ng build); якщо його немає, сервер працює лише як API
  STATIC_DIR: path.resolve(process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser')),
  MAX_RUNS: 50,                 // скільки запусків зберігати в історії
  MAX_BODY_BYTES: 10 * 1024,    // обмеження розміру тіла запиту
  GRID_SIZE: 60,                // розмір сітки клітинного автомата (60 x 60)
  MAPS: { 1: 42, 2: 7, 3: 2024 },   // номер карти -> зерно генерації місцевості
  MAX_IGNITIONS: 20,            // скільки точок займання можна поставити
  DEFAULT_STEPS: 120,
  MAX_STEPS: 200
};
