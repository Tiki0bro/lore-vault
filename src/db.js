const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'lore.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database lore.db:', err.message);
  } else {
    console.log('Connected to local SQLite database lore.db');
  }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS worlds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        genre TEXT DEFAULT 'Fantasy',
        theme TEXT DEFAULT 'ancient-codex',
        header_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT,
        summary TEXT,
        content TEXT NOT NULL,
        tags TEXT,
        header_image TEXT,
        world_id TEXT REFERENCES worlds(id) ON DELETE CASCADE,
        is_favorite INTEGER DEFAULT 0,
        pin_to_sidebar INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS article_statblocks (
        article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
        armor_class INTEGER DEFAULT 10,
        hit_points INTEGER DEFAULT 10,
        speed TEXT DEFAULT '30 ft.',
        str INTEGER DEFAULT 10,
        dex INTEGER DEFAULT 10,
        con INTEGER DEFAULT 10,
        int INTEGER DEFAULT 10,
        wis INTEGER DEFAULT 10,
        cha INTEGER DEFAULT 10,
        challenge_rating TEXT DEFAULT '1/4',
        actions_json TEXT,
        player_secrets TEXT,
        dm_secrets TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS lore_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        source_entity_title TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        target_entity_title TEXT NOT NULL,
        relationship_type TEXT NOT NULL DEFAULT 'neutral',
        sentiment_score INTEGER DEFAULT 0,
        summary TEXT,
        is_secret INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
        UNIQUE(world_id, source_entity_id, target_entity_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS maps (
        id TEXT PRIMARY KEY,
        world_id TEXT NOT NULL,
        parent_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL,
        parent_pin_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        image_path TEXT NOT NULL,
        width INTEGER DEFAULT 1920,
        height INTEGER DEFAULT 1080,
        scale_pixels REAL DEFAULT 100.0,
        scale_distance REAL DEFAULT 10.0,
        scale_unit TEXT DEFAULT 'miles',
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS map_pins (
        id TEXT PRIMARY KEY,
        map_id TEXT NOT NULL,
        article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
        x_pct REAL NOT NULL,
        y_pct REAL NOT NULL,
        label TEXT NOT NULL,
        pin_icon TEXT DEFAULT 'fa-location-dot',
        pin_color TEXT DEFAULT '#d97706',
        is_secret INTEGER DEFAULT 0,
        sub_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL,
        target_sub_map_id TEXT,
        category TEXT DEFAULT 'Location',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        world_id TEXT NOT NULL,
        article_id TEXT,
        title TEXT NOT NULL,
        epoch_name TEXT DEFAULT 'Common Era',
        display_year TEXT NOT NULL,
        sort_order REAL NOT NULL,
        summary TEXT,
        content TEXT,
        category TEXT DEFAULT 'Historical',
        is_secret INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS lore_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT DEFAULT '📜',
        fields_json TEXT,
        boilerplate_markdown TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS manuscript_chapters (
        id TEXT PRIMARY KEY,
        world_id TEXT NOT NULL,
        act_number INTEGER DEFAULT 1,
        chapter_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        pov_character_id TEXT,
        location_id TEXT,
        target_word_count INTEGER DEFAULT 3000,
        current_word_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Draft',
        sort_order REAL NOT NULL,
        content TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS manuscript_autosave_buffers (
        id TEXT PRIMARY KEY,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        content TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        wpm REAL DEFAULT 0,
        cursor_pos INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(target_id, target_type)
      )
    `);

    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
        id UNINDEXED,
        title,
        category,
        summary,
        content,
        tags
      )
    `, (err) => {
      if (!err) {
        db.run(`INSERT OR REPLACE INTO articles_fts(id, title, category, summary, content, tags) SELECT id, title, category, summary, content, tags FROM articles`);
      }
    });
  });
}

initDatabase();

module.exports = db;
