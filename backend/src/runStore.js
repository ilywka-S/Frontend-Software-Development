// Проста файлова історія запусків (JSON). Для великого проєкту її варто замінити на БД.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

function load() {
  try { return JSON.parse(fs.readFileSync(config.RUNS_FILE, 'utf8')); }
  catch { return []; }
}

function save(runs) {
  fs.mkdirSync(path.dirname(config.RUNS_FILE), { recursive: true });
  const tmp = config.RUNS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(runs, null, 2));
  fs.renameSync(tmp, config.RUNS_FILE);        // атомарний запис
}

module.exports = {
  list: () => load().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  get: (id) => load().find((r) => r.id === id) || null,
  add(record) {
    const run = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...record };
    const runs = load();
    runs.push(run);
    save(runs.slice(-config.MAX_RUNS));
    return run;
  },
  remove(id) {
    const runs = load();
    const left = runs.filter((r) => r.id !== id);
    if (left.length === runs.length) return false;
    save(left);
    return true;
  }
};
