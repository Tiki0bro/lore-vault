const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Initializes database tables including context_snapshots.
 * @param {import('sqlite3').Database} [db]
 * @returns {Promise<import('sqlite3').Database>}
 */
function initDb(db) {
  return new Promise((resolve, reject) => {
    if (!db) {
      const dbDir = path.join(__dirname);
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      const dbPath = path.join(dbDir, 'lore.db');
      db = new sqlite3.Database(dbPath);
    }

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS context_snapshots (
          id TEXT PRIMARY KEY,
          world_id TEXT,
          name TEXT NOT NULL,
          preset_type TEXT NOT NULL,
          config_json TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) return reject(err);
        resolve(db);
      });
    });
  });
}

module.exports = { initDb };
