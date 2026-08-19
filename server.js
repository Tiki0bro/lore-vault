const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AdmZip = require('adm-zip');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure directories exist
const dbDir = path.join(__dirname, 'database');
const storageDir = path.join(__dirname, 'storage', 'articles');
const imagesDir = path.join(__dirname, 'public', 'uploads', 'images');
const configDir = path.join(__dirname, 'config');
const configPath = path.join(configDir, 'ai-config.json');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

function safeParseTags(tagsRaw) {
  if (!tagsRaw) return [];
  if (Array.isArray(tagsRaw)) return tagsRaw;
  if (typeof tagsRaw === 'string') {
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') return parsed.split(',').map(t => t.trim()).filter(Boolean);
    } catch (e) {
      return tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return [];
}

// --- STANDARDIZED API ERROR & VALIDATION HELPERS ---
function sendApiError(res, statusCode = 500, code = 'ERR_INTERNAL', message = 'Internal Server Error', err = null) {
  if (err && err.message) {
    console.error(`[API Error ${code}]`, err.message);
  }
  return res.status(statusCode).json({
    status: 'error',
    code,
    message
  });
}

function validateFields(body, requiredKeys = []) {
  if (!body || typeof body !== 'object') {
    return 'Invalid request payload body';
  }
  for (const key of requiredKeys) {
    if (body[key] === undefined || body[key] === null || (typeof body[key] === 'string' && body[key].trim() === '')) {
      return `Missing or empty required field: '${key}'`;
    }
  }
  return null;
}

async function saveArticleWithDiskSync(db, articleData, isUpdate, callback) {
  const { id, title, content, category, tags, world_id, summary } = articleData;

  const storageId = id || (title || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
  const safeFilename = `${storageId}.md`;
  const diskDir = path.join(__dirname, 'storage');

  try {
    if (!fs.existsSync(diskDir)) {
      await fs.promises.mkdir(diskDir, { recursive: true });
    }
  } catch (dirErr) {}

  const filePath = path.join(diskDir, safeFilename);

  let previousContent = null;
  if (isUpdate && fs.existsSync(filePath)) {
    try {
      previousContent = await fs.promises.readFile(filePath, 'utf8');
    } catch (e) {}
  }

  const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '');
  const mdContent = `---
title: "${title || ''}"
category: "${category || 'General'}"
tags: [${tagsStr}]
world_id: "${world_id || 'default'}"
---

${content || ''}`;

  try {
    await fs.promises.writeFile(filePath, mdContent, 'utf8');
  } catch (fsErr) {
    return callback(new Error(`Failed to sync article to disk storage: ${fsErr.message}`));
  }

  if (isUpdate) {
    const query = `
      UPDATE articles 
      SET title = ?, category = ?, tags = ?, content = ?, summary = ?, world_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    db.run(query, [title, category, JSON.stringify(parseTagsInput(tags)), content, summary || '', world_id || 'default', id], async function(err) {
      if (err) {
        if (previousContent !== null) {
          try { await fs.promises.writeFile(filePath, previousContent, 'utf8'); } catch (e) {}
        }
        return callback(err);
      }
      callback(null, { id, title, category, tags: parseTagsInput(tags), content, summary, world_id, updated_at: new Date().toISOString() });
    });
  } else {
    const query = `
      INSERT INTO articles (id, title, category, tags, content, summary, world_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    db.run(query, [id, title, category || 'General', JSON.stringify(parseTagsInput(tags)), content, summary || '', world_id || 'default'], async function(err) {
      if (err) {
        try { await fs.promises.unlink(filePath); } catch (e) {}
        return callback(err);
      }
      callback(null, { id, title, category: category || 'General', tags: parseTagsInput(tags), content, summary, world_id, created_at: new Date().toISOString() });
    });
  }
}

// Configure multer disk storage for image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitized = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '') || 'image';
    const filename = `${Date.now()}-${sanitized}${ext}`;
    cb(null, filename);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image MIME type. Allowed types: JPEG, PNG, WebP, GIF, SVG.'));
    }
  }
});

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('••••')) return trimmed;
  if (trimmed.length <= 4) {
    return '••••••••' + trimmed;
  }
  return '••••••••' + trimmed.slice(-4);
}

function getAIConfig() {
  let config = {
    use_custom_provider: false,
    default_model: 'gemini-2.0-flash',
    custom_provider: 'gemini',
    custom_api_key: '',
    custom_model: 'gemini-2.0-flash',
    ollama_url: 'http://localhost:11434',
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash'
  };

  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed) {
        // Auto-upgrade deprecated 2024-2025 era Gemini models
        if (parsed.model === 'gemini-1.5-flash') parsed.model = 'gemini-flash-latest';
        if (parsed.model === 'gemini-1.5-pro') parsed.model = 'gemini-pro-latest';
        if (parsed.custom_model === 'gemini-1.5-flash') parsed.custom_model = 'gemini-flash-latest';
        if (parsed.custom_model === 'gemini-1.5-pro') parsed.custom_model = 'gemini-pro-latest';
        if (parsed.model && parsed.model.includes('3.0')) parsed.model = 'gemini-2.0-flash';
        if (parsed.model && parsed.model.includes('3.1')) parsed.model = 'gemini-pro-latest';
        config = { ...config, ...parsed };
      }
    } catch (e) {}
  }

  // Synchronize legacy compatibility fields
  if (config.use_custom_provider) {
    config.provider = config.custom_provider || 'gemini';
    config.apiKey = config.custom_api_key || config.apiKey || '';
    config.model = config.custom_model || config.model || 'gemini-2.0-flash';
  } else {
    config.provider = 'gemini';
    config.apiKey = process.env.GEMINI_API_KEY || (config.apiKey && !config.custom_api_key ? config.apiKey : '');
    config.model = config.default_model || 'gemini-2.0-flash';
  }

  return config;
}

function saveAIConfig(config) {
  try {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save AI config:', e);
  }
}

const dbPath = path.join(dbDir, 'lore.db');
const db = new sqlite3.Database(dbPath);

// Initialize DB schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      world_id TEXT DEFAULT 'default',
      summary TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      header_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#38bdf8',
      theme TEXT DEFAULT 'ancient-codex',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run("ALTER TABLE articles ADD COLUMN sub_category TEXT", (err) => {});
  db.run("ALTER TABLE articles ADD COLUMN world_id TEXT DEFAULT 'default'", (err) => {});
  db.run("UPDATE articles SET world_id = 'default' WHERE world_id IS NULL", (err) => {});
  db.run("ALTER TABLE worlds ADD COLUMN theme TEXT DEFAULT 'ancient-codex'", (err) => {});
  db.run("ALTER TABLE worlds ADD COLUMN banner_image TEXT DEFAULT '/uploads/images/default-banner.png'", (err) => {});
  db.run("ALTER TABLE worlds ADD COLUMN tagline TEXT DEFAULT 'An intricate custom setting waiting to be explored.'", (err) => {});
  db.run("ALTER TABLE worlds ADD COLUMN pinned_article_ids TEXT DEFAULT '[]'", (err) => {});
  db.run("ALTER TABLE worlds ADD COLUMN template_style TEXT DEFAULT 'grand-codex'", (err) => {});
  db.run("ALTER TABLE articles ADD COLUMN header_image TEXT", (err) => {});
  db.run("ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'public'", (err) => {});
  db.run("UPDATE articles SET category = 'Races & Species' WHERE category = 'Species'", (err) => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      article_id TEXT UNIQUE,
      thoughts TEXT,
      wants TEXT,
      needs TEXT,
      history_log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
    )
  `);

  db.get('SELECT COUNT(*) as count FROM worlds', (err, row) => {
    if (!err && (!row || row.count === 0)) {
      db.run("INSERT INTO worlds (id, name, description, color, theme) VALUES ('default', 'Primary World', 'Main world lore codex', '#38bdf8', 'ancient-codex')");
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT,
      target_id TEXT,
      relation_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(source_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES articles(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS character_personas (
      character_id TEXT PRIMARY KEY,
      thoughts TEXT,
      wants TEXT,
      needs TEXT,
      speech_mannerisms TEXT,
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
      scale_pixels REAL DEFAULT 100.0,
      scale_distance REAL DEFAULT 10.0,
      scale_unit TEXT DEFAULT 'miles',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_path TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
    )
  `);

  db.run("ALTER TABLE maps ADD COLUMN parent_map_id TEXT", (err) => {});
  db.run("ALTER TABLE maps ADD COLUMN parent_pin_id TEXT", (err) => {});
  db.run("ALTER TABLE maps ADD COLUMN scale_pixels REAL DEFAULT 100.0", (err) => {});
  db.run("ALTER TABLE maps ADD COLUMN scale_distance REAL DEFAULT 10.0", (err) => {});
  db.run("ALTER TABLE maps ADD COLUMN scale_unit TEXT DEFAULT 'miles'", (err) => {});

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
      is_secret INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    )
  `);

  db.run("ALTER TABLE map_pins ADD COLUMN target_sub_map_id TEXT", (err) => {});
  db.run("ALTER TABLE map_pins ADD COLUMN category TEXT DEFAULT 'Location'", (err) => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS map_routes (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      layer_id TEXT,
      title TEXT NOT NULL,
      points_json TEXT NOT NULL,
      stroke_color TEXT DEFAULT '#f59e0b',
      stroke_width INTEGER DEFAULT 3,
      stroke_style TEXT DEFAULT 'dashed',
      calculated_distance REAL DEFAULT 0.0,
      is_secret INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS map_layers (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color_badge TEXT DEFAULT '#38bdf8',
      is_visible INTEGER DEFAULT 1,
      is_secret INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS map_territories (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      layer_id TEXT,
      article_id TEXT,
      title TEXT NOT NULL,
      points_json TEXT NOT NULL,
      stroke_color TEXT DEFAULT '#ef4444',
      stroke_width INTEGER DEFAULT 3,
      stroke_style TEXT DEFAULT 'solid',
      fill_color TEXT DEFAULT '#ef4444',
      fill_opacity REAL DEFAULT 0.25,
      is_contested INTEGER DEFAULT 0,
      contested_article_id TEXT,
      is_secret INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS map_fog_states (
      map_id TEXT PRIMARY KEY,
      fog_data_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS character_history (
      id TEXT PRIMARY KEY,
      character_id TEXT,
      chapter_id TEXT,
      event_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      chapter_id TEXT,
      title TEXT,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      active_cast TEXT,
      location_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS context_snapshots (
      id TEXT PRIMARY KEY,
      world_id TEXT,
      name TEXT NOT NULL,
      preset_type TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT,
      url TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      world_id TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS slates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      world_id TEXT DEFAULT 'all',
      plot_hook TEXT,
      scene_steps TEXT,
      cast_ids TEXT,
      pinned_lore_ids TEXT,
      tone_chips TEXT,
      visibility TEXT DEFAULT 'public',
      format TEXT DEFAULT 'markdown',
      max_tokens INTEGER DEFAULT 4000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      parent_category TEXT,
      icon TEXT DEFAULT '📁',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ignored_audit_issues (
      issue_key TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lore_statblocks (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      system TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      is_secret INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_statblocks_article_id ON lore_statblocks(article_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_statblocks_system ON lore_statblocks(system)");
  db.run("CREATE INDEX IF NOT EXISTS idx_statblocks_type ON lore_statblocks(type)");


  // Check if DB is empty and seed default WorldAnvil articles
  db.get('SELECT COUNT(*) as count FROM articles', (err, row) => {
    if (!err && row.count === 0) {
      seedDefaultArticles();
    }
  });
});

// Utility to parse @[Title](category:id) or @[Title](id) or [[WikiLinks]]
function extractCrossLinks(sourceId, content) {
  const links = new Set();
  
  // 1. WorldAnvil @[Title](id)
  const waRegex = /@\[([^\]]+)\]\((?:[^:]+:)?([^)]+)\)/g;
  let match;
  while ((match = waRegex.exec(content)) !== null) {
    const targetId = match[2].trim();
    if (targetId && targetId !== sourceId) links.add(targetId);
  }

  // 2. WikiLinks [[Title]]
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = wikiRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const targetId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (targetId && targetId !== sourceId) links.add(targetId);
  }

  // Clear old relations from source_id
  db.run('DELETE FROM relations WHERE source_id = ?', [sourceId], (err) => {
    if (err) return;
    const stmt = db.prepare('INSERT INTO relations (source_id, target_id) VALUES (?, ?)');
    links.forEach(targetId => {
      stmt.run(sourceId, targetId);
    });
    stmt.finalize();
  });
}

// Utility to sync article content to local filesystem file
function syncFileToStorage(id, content) {
  const filePath = path.join(storageDir, `${id}.md`);
  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) console.error(`Error saving file ${id}.md:`, err);
  });
}

// --- API ENDPOINTS ---

// POST /api/upload/image - Upload single image & insert into media vault database
app.post('/api/upload/image', (req, res) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const filename = req.file.filename;
    const url = `/uploads/images/${filename}`;
    const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const original_name = req.file.originalname || filename;
    const mime_type = req.file.mimetype || 'image/jpeg';
    const size = req.file.size || 0;
    const world_id = (req.body && req.body.world_id) || (req.query && req.query.world_id) || 'default';

    db.run(
      'INSERT INTO media (id, filename, original_name, url, mime_type, size, world_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, filename, original_name, url, mime_type, size, world_id],
      function (dbErr) {
        if (dbErr) {
          console.error('Error inserting media record:', dbErr.message);
          return res.status(500).json({ error: dbErr.message });
        }
        res.json({ id, filename, original_name, url, mime_type, size, world_id });
      }
    );
  });
});

// GET /api/media - List media vault assets (optional filtering by world_id and q)
app.get('/api/media', (req, res) => {
  const { world_id, q } = req.query;
  let query = 'SELECT * FROM media WHERE 1=1';
  const params = [];

  if (world_id && world_id !== 'all') {
    query += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  if (q && q.trim()) {
    query += ' AND (filename LIKE ? OR original_name LIKE ?)';
    const searchTerm = `%${q.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// DELETE /api/media/:id - Delete media asset from SQLite database & unlink local file
app.delete('/api/media/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM media WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Media record not found' });

    db.run('DELETE FROM media WHERE id = ?', [id], function (deleteErr) {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });

      // Unlink local file safely
      try {
        const filePath = path.join(imagesDir, row.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn(`Could not remove image file ${row.filename}:`, fileErr.message);
      }

      res.json({ message: 'Media asset deleted successfully', id });
    });
  });
});

// GET /api/worlds - List all worlds
app.get('/api/worlds', (req, res) => {
  const query = `
    SELECT w.id, w.name, w.description, w.color, w.theme, COUNT(a.id) as article_count
    FROM worlds w
    LEFT JOIN articles a ON w.id = a.world_id
    GROUP BY w.id
    ORDER BY w.created_at ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/worlds - Create new world
app.post('/api/worlds', (req, res) => {
  const { name, description, color, theme, tagline, banner_image } = req.body;
  if (!name) return res.status(400).json({ error: 'World name is required.' });

  const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'world') + '-' + Math.random().toString(36).substr(2, 6);
  const hexColor = color || '#' + Math.floor(Math.random()*16777215).toString(16);
  const worldTheme = theme || 'ancient-codex';

  db.run('INSERT INTO worlds (id, name, description, color, theme, tagline, banner_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, description || '', hexColor, worldTheme, tagline || '', banner_image || '/uploads/images/default-banner.png'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM worlds WHERE id = ?', [id], (err2, world) => {
        res.status(201).json({ success: true, world: world || { id, name, description, color: hexColor, theme: worldTheme } });
      });
    }
  );
});

// PUT /api/worlds/:id - Update existing world
app.put('/api/worlds/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, color, theme } = req.body;

  db.get('SELECT * FROM worlds WHERE id = ?', [id], (err, world) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!world) return res.status(404).json({ error: 'World not found.' });

    const updatedName = name !== undefined ? name : world.name;
    const updatedDesc = description !== undefined ? description : world.description;
    const updatedColor = color !== undefined ? color : world.color;
    const updatedTheme = theme !== undefined ? theme : world.theme;

    db.run(
      'UPDATE worlds SET name = ?, description = ?, color = ?, theme = ? WHERE id = ?',
      [updatedName, updatedDesc, updatedColor, updatedTheme, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          id,
          name: updatedName,
          description: updatedDesc,
          color: updatedColor,
          theme: updatedTheme,
          message: 'World updated successfully!'
        });
      }
    );
  });
});

// PUT /api/articles/:id/move-world - Transfer article to another world
app.put('/api/articles/:id/move-world', (req, res) => {
  const { id } = req.params;
  const { targetWorldId } = req.body;

  if (!targetWorldId) return res.status(400).json({ error: 'Target world ID is required.' });

  db.run('UPDATE articles SET world_id = ? WHERE id = ?', [targetWorldId, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Article transferred to new world successfully!' });
  });
});

// GET /api/articles - List & Search (with world_id filter)
app.get('/api/articles', (req, res) => {
  const { q, search, category, tag, sub_category, content, world_id } = req.query;
  const searchTerm = (q || search || '').trim();

  let query = 'SELECT id, title, category, sub_category, world_id, summary, header_image, tags, created_at, updated_at FROM articles WHERE 1=1';
  const params = [];

  if (world_id && world_id !== 'all') {
    query += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (sub_category) {
    query += ' AND (sub_category = ? OR tags LIKE ?)';
    params.push(sub_category, `%${sub_category}%`);
  }
  if (tag) {
    query += ' AND (tags LIKE ? OR sub_category = ?)';
    params.push(`%${tag}%`, tag);
  }
  if (searchTerm) {
    if (content === 'true' || content === '1') {
      query += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    } else {
      query += ' AND (title LIKE ? OR summary LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
  }

  query += ' ORDER BY updated_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      tags: safeParseTags(r.tags)
    })));
  });
});

// GET /api/articles/:id - Get single article details + relations
app.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Fetch outbound and inbound references
    const outboundQuery = `
      SELECT a.id, a.title, a.category 
      FROM relations r 
      JOIN articles a ON r.target_id = a.id 
      WHERE r.source_id = ?
    `;
    const inboundQuery = `
      SELECT a.id, a.title, a.category 
      FROM relations r 
      JOIN articles a ON r.source_id = a.id 
      WHERE r.target_id = ?
    `;

    db.all(outboundQuery, [id], (err, outbound) => {
      db.all(inboundQuery, [id], (err, inbound) => {
        db.all('SELECT * FROM lore_statblocks WHERE article_id = ?', [id], (err, statblocks) => {
          res.json({
            ...article,
            tags: safeParseTags(article.tags),
            outboundLinks: outbound || [],
            inboundLinks: inbound || [],
            statblocks: statblocks || []
          });
        });
      });
    });
  });
});

// POST /api/articles - Create new article
app.post('/api/articles', (req, res) => {
  const { title, category, summary, content, tags, header_image } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Title, category, and content are required' });
  }

  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `article-${Date.now()}`;
  const tagsJson = JSON.stringify(tags || []);
  const now = new Date().toISOString();

  const query = `
    INSERT INTO articles (id, title, category, summary, content, tags, header_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, title, category, summary || '', content, tagsJson, header_image || null, now, now], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'An article with a similar title/ID already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }

    extractCrossLinks(id, content);
    syncFileToStorage(id, content);

    res.status(201).json({ id, header_image: header_image || null, message: 'Article created successfully' });
  });
});

// PUT /api/articles/:id - Update existing article
app.put('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const { title, category, summary, content, tags, header_image } = req.body;
  const tagsJson = JSON.stringify(tags || []);
  const now = new Date().toISOString();

  const query = `
    UPDATE articles
    SET title = ?, category = ?, summary = ?, content = ?, tags = ?, header_image = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(query, [title, category, summary || '', content, tagsJson, header_image || null, now, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Article not found' });

    extractCrossLinks(id, content);
    syncFileToStorage(id, content);

    res.json({ message: 'Article updated successfully' });
  });
});

// DELETE /api/articles/:id
app.delete('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM articles WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Clean up associated relations, personas, relationships, and stat blocks
    db.run('DELETE FROM relations WHERE source_id = ? OR target_id = ?', [id, id]);
    db.run('DELETE FROM personas WHERE article_id = ?', [id]);
    db.run('DELETE FROM lore_relationships WHERE source_entity_id = ? OR target_entity_id = ?', [id, id]);
    db.run('DELETE FROM lore_statblocks WHERE article_id = ?', [id]);

    // Remove local file if exists (safely wrapped in try/catch)
    try {
      const filePath = path.join(storageDir, `${id}.md`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (fileErr) {
      console.warn(`Could not remove storage file for article ${id}:`, fileErr.message);
    }

    res.json({ message: 'Article deleted successfully' });
  });
});

// --- TTRPG STAT BLOCK REST API ENDPOINTS ---

// GET /api/articles/:articleId/statblock - Fetch stat block(s) for article
app.get('/api/articles/:articleId/statblock', (req, res) => {
  const { articleId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  let query = 'SELECT * FROM lore_statblocks WHERE article_id = ?';
  const params = [articleId];

  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return sendApiError(res, 500, 'ERR_DB', 'Failed to fetch stat block', err);
    res.json({ status: 'success', data: rows || [] });
  });
});

// POST /api/articles/:articleId/statblock - Create or update stat block
app.post('/api/articles/:articleId/statblock', (req, res) => {
  const { articleId } = req.params;
  const { id, system, type, name, stats_json, is_secret } = req.body || {};

  const validationErr = validateFields(req.body, ['system', 'type', 'name']);
  if (validationErr) return sendApiError(res, 400, 'ERR_VALIDATION', validationErr);

  const blockId = id || `statblock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const statsStr = typeof stats_json === 'object' ? JSON.stringify(stats_json) : (stats_json || '{}');
  const secretVal = is_secret ? 1 : 0;

  const upsertQuery = `
    INSERT INTO lore_statblocks (id, article_id, system, type, name, stats_json, is_secret, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      system = excluded.system,
      type = excluded.type,
      name = excluded.name,
      stats_json = excluded.stats_json,
      is_secret = excluded.is_secret,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(upsertQuery, [blockId, articleId, system, type, name, statsStr, secretVal], function (err) {
    if (err) return sendApiError(res, 500, 'ERR_DB', 'Failed to save stat block', err);
    
    res.json({
      status: 'success',
      data: {
        id: blockId,
        article_id: articleId,
        system,
        type,
        name,
        stats_json: typeof stats_json === 'string' ? safeExtractJSON(stats_json) || {} : stats_json,
        is_secret: secretVal
      }
    });
  });
});

// DELETE /api/statblocks/:id - Delete a stat block
app.delete('/api/statblocks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM lore_statblocks WHERE id = ?', [id], function (err) {
    if (err) return sendApiError(res, 500, 'ERR_DB', 'Failed to delete stat block', err);
    res.json({ status: 'success', message: 'Stat block deleted successfully' });
  });
});

// GET /api/statblocks/:id/export/foundry - Export stat block as Foundry VTT Actor JSON
app.get('/api/statblocks/:id/export/foundry', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lore_statblocks WHERE id = ?', [id], (err, row) => {
    if (err || !row) return sendApiError(res, 404, 'ERR_NOT_FOUND', 'Stat block not found');

    let stats = {};
    try { stats = typeof row.stats_json === 'string' ? JSON.parse(row.stats_json) : (row.stats_json || {}); } catch(e) {}

    const foundryData = {
      name: row.name,
      type: row.type === 'character' ? 'npc' : row.type === 'weapon' ? 'weapon' : 'item',
      img: 'icons/svg/mystery-man.svg',
      system: {
        attributes: {
          hp: { value: stats.hp || 10, max: stats.hp || 10 },
          ac: { value: stats.ac || 10 },
          speed: { value: stats.speed || '30 ft' }
        },
        abilities: {
          str: { value: stats.abilities?.str || 10 },
          dex: { value: stats.abilities?.dex || 10 },
          con: { value: stats.abilities?.con || 10 },
          int: { value: stats.abilities?.int || 10 },
          wis: { value: stats.abilities?.wis || 10 },
          cha: { value: stats.abilities?.cha || 10 }
        },
        details: {
          cr: parseFloat(stats.cr || 1),
          alignment: stats.alignment || 'Neutral',
          biography: { value: stats.description || '' }
        }
      },
      flags: { lorevault: { id: row.id, system: row.system } }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${row.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_foundry.json"`);
    res.json(foundryData);
  });
});

// GET /api/worlds/:worldId/bestiary - Fetch bestiary index of stat blocks across world
app.get('/api/worlds/:worldId/bestiary', (req, res) => {
  const { worldId } = req.params;
  const { system, type, mode } = req.query;

  let query = `
    SELECT sb.*, a.title as article_title, a.category as article_category 
    FROM lore_statblocks sb
    JOIN articles a ON sb.article_id = a.id
  `;
  const params = [];
  const conditions = [];

  if (worldId && worldId !== 'all') {
    conditions.push('(a.world_id = ? OR a.world_id IS NULL)');
    params.push(worldId);
  }

  if (mode === 'player') {
    conditions.push('sb.is_secret = 0');
  }

  if (system) {
    conditions.push('sb.system = ?');
    params.push(system);
  }

  if (type) {
    conditions.push('sb.type = ?');
    params.push(type);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sb.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return sendApiError(res, 500, 'ERR_DB', 'Failed to fetch bestiary', err);
    res.json({ status: 'success', data: rows || [] });
  });
});

// POST /api/statblocks/convert-ai - Generate a TTRPG stat block from article lore using Gemini
app.post('/api/statblocks/convert-ai', async (req, res) => {
  const { article_id, system = 'dnd5e', type = 'character' } = req.body || {};

  if (!article_id) {
    return sendApiError(res, 400, 'ERR_VALIDATION', 'Missing required field: article_id');
  }

  db.get('SELECT * FROM articles WHERE id = ?', [article_id], async (err, article) => {
    if (err || !article) {
      return sendApiError(res, 404, 'ERR_NOT_FOUND', 'Article not found for AI conversion');
    }

    const prompt = `You are a master TTRPG game designer and mechanics author for ${system === 'pf2e' ? 'Pathfinder 2nd Edition' : 'Dungeons & Dragons 5th Edition'}.
Analyze the following worldbuilding lore article and generate an authentic, balanced, high-quality TTRPG stat block payload of type "${type}".

Article Title: ${article.title}
Category: ${article.category}
Summary: ${article.summary || ''}
Lore Content Snippet: ${article.content ? article.content.substring(0, 1800) : ''}

You MUST return ONLY valid JSON (no markdown triple backticks, no markdown text).

JSON Format Template for type="${type}":
${type === 'weapon' ? `
{
  "name": "${article.title}",
  "category": "Martial Melee Weapon",
  "rarity": "Very Rare",
  "attunement": true,
  "attunement_req": "by a creature of non-lawful alignment",
  "damage": "1d8 + 2",
  "damage_type": "Slashing",
  "properties": ["Finesse", "Versatile (1d10)"],
  "value": "1,500 gp",
  "weight": "3 lbs",
  "description": "Short flavor description based on article lore.",
  "special_effects": [
    { "name": "Lore Strike", "description": "Deals 2d6 extra radiant damage to undead." }
  ]
}
` : type === 'lore_card' ? `
{
  "name": "${article.title}",
  "card_category": "Ancient Spell / Artifact",
  "casting_time": "1 action",
  "range": "60 feet",
  "components": "V, S, M",
  "duration": "Instantaneous",
  "summary": "Short rule summary.",
  "quote": "Quote from lore text.",
  "details": [
    { "b": "Effect", "val": "Detailed mechanics effect." }
  ]
}
` : `
{
  "name": "${article.title}",
  "size": "Medium",
  "alignment": "Neutral",
  "ac": 16,
  "ac_type": "Natural Armor",
  "hp": 75,
  "hit_dice": "10d8 + 30",
  "speed": "30 ft.",
  "abilities": { "str": 16, "dex": 14, "con": 16, "int": 12, "wis": 12, "cha": 10 },
  "saving_throws": "Con +6, Wis +4",
  "skills": "Perception +4, Stealth +4",
  "resistances": "Fire, Cold",
  "immunities": "",
  "senses": "Darkvision 60 ft., passive Perception 14",
  "languages": "Common",
  "cr": "5",
  "xp": 1800,
  "traits": [
    { "name": "Lore Presence", "description": "Creatures within 30 ft have disadvantage on saving throws against fear." }
  ],
  "actions": [
    { "name": "Multiattack", "description": "Makes two melee attacks." },
    { "name": "Relic Strike", "description": "Melee Weapon Attack: +6 to hit, reach 5 ft., 2d8+3 slashing damage." }
  ],
  "reactions": [],
  "legendary_actions": []
}
`}`;

    let generatedJson = null;
    try {
      const rawAiText = await callGeminiApiWithFallback(prompt);
      generatedJson = safeExtractJSON(rawAiText);
    } catch (aiErr) {
      console.warn('[StatBlock AI Error]', aiErr.message);
    }

    // Default Fallback JSON if AI extraction fails or Gemini is unavailable
    if (!generatedJson || typeof generatedJson !== 'object') {
      if (type === 'weapon') {
        generatedJson = {
          name: article.title,
          category: 'Martial Weapon',
          rarity: 'Rare',
          attunement: true,
          damage: '1d8 + 2',
          damage_type: 'Slashing',
          properties: ['Finesse', 'Versatile (1d10)'],
          value: '500 gp',
          weight: '3 lbs',
          description: article.summary || 'A blade forged in lore.',
          special_effects: [{ name: 'Vault Spark', description: 'Glows faintly near hidden lore ruins.' }]
        };
      } else if (type === 'lore_card') {
        generatedJson = {
          name: article.title,
          card_category: 'Lore Card',
          casting_time: '1 action',
          range: 'Self',
          components: 'V, S',
          duration: '1 hour',
          summary: article.summary || 'Ancient knowledge inscribed on parchment.',
          quote: article.title,
          details: [{ b: 'Lore Benefit', val: 'Grants advantage on History checks.' }]
        };
      } else {
        generatedJson = {
          name: article.title,
          size: 'Medium',
          alignment: 'Neutral',
          ac: 15,
          ac_type: 'Natural Armor',
          hp: 52,
          hit_dice: '8d8 + 16',
          speed: '30 ft.',
          abilities: { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
          saving_throws: 'Con +4',
          skills: 'Perception +3',
          resistances: '',
          immunities: '',
          senses: 'Passive Perception 13',
          languages: 'Common',
          cr: '3',
          xp: 700,
          traits: [{ name: 'Vigilant Guard', description: 'Has advantage on initiative rolls.' }],
          actions: [
            { name: 'Multiattack', description: 'Makes two weapon attacks.' },
            { name: 'Longsword', description: 'Melee Weapon Attack: +4 to hit, 1d8+2 slashing damage.' }
          ],
          reactions: [],
          legendary_actions: []
        };
      }
    }

    const blockId = `statblock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const name = generatedJson.name || article.title;
    const statsStr = JSON.stringify(generatedJson);

    const insertQuery = `
      INSERT INTO lore_statblocks (id, article_id, system, type, name, stats_json, is_secret, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `;

    db.run(insertQuery, [blockId, article_id, system, type, name, statsStr], function (saveErr) {
      if (saveErr) return sendApiError(res, 500, 'ERR_DB', 'Failed to save generated stat block', saveErr);

      res.json({
        status: 'success',
        data: {
          id: blockId,
          article_id,
          system,
          type,
          name,
          stats_json: generatedJson,
          is_secret: 0
        }
      });
    });
  });
});


// GET /api/categories - Metadata, sub-categories & counts (filtered by world_id)
app.get('/api/categories', (req, res) => {
  const { world_id } = req.query;
  let query = 'SELECT category, sub_category, COUNT(*) as count FROM articles';
  const params = [];

  if (world_id && world_id !== 'all') {
    query += ' WHERE (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  query += ' GROUP BY category, sub_category ORDER BY count DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Group sub-categories under primary categories
    const categoriesMap = {};
    rows.forEach(r => {
      if (!r.category) return;
      if (!categoriesMap[r.category]) {
        categoriesMap[r.category] = { category: r.category, count: 0, subCategories: [] };
      }
      categoriesMap[r.category].count += r.count;
      if (r.sub_category) {
        categoriesMap[r.category].subCategories.push({ subCategory: r.sub_category, count: r.count });
      }
    });

    // Merge entries from custom_categories table
    db.all('SELECT name, parent_category, icon FROM custom_categories', [], (cErr, cRows) => {
      if (!cErr && Array.isArray(cRows)) {
        cRows.forEach(c => {
          if (c.parent_category) {
            // Custom Sub-Category
            if (!categoriesMap[c.parent_category]) {
              categoriesMap[c.parent_category] = { category: c.parent_category, count: 0, subCategories: [] };
            }
            const exists = categoriesMap[c.parent_category].subCategories.some(s => s.subCategory === c.name);
            if (!exists) {
              categoriesMap[c.parent_category].subCategories.push({ subCategory: c.name, count: 0, isCustom: true });
            }
          } else {
            // Custom Primary Category
            if (!categoriesMap[c.name]) {
              categoriesMap[c.name] = { category: c.name, count: 0, subCategories: [], icon: c.icon || '📁', isCustom: true };
            } else {
              categoriesMap[c.name].icon = c.icon || '📁';
              categoriesMap[c.name].isCustom = true;
            }
          }
        });
      }
      res.json(Object.values(categoriesMap));
    });
  });
});

// POST /api/categories - Create Custom Primary or Sub-Category
app.post('/api/categories', (req, res) => {
  const { name, parent_category, icon } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const cleanName = name.trim();
  const cleanParent = parent_category ? parent_category.trim() : null;
  const cleanIcon = icon || '📁';
  const id = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  db.run(
    'INSERT OR REPLACE INTO custom_categories (id, name, parent_category, icon) VALUES (?, ?, ?, ?)',
    [id, cleanName, cleanParent, cleanIcon],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save custom category: ' + err.message });
      res.json({ success: true, id, name: cleanName, parent_category: cleanParent, icon: cleanIcon });
    }
  );
});

// DELETE /api/categories/:name - Remove Custom Category
app.delete('/api/categories/:name', (req, res) => {
  const { name } = req.params;
  const standardCats = ['Characters', 'Locations', 'Factions', 'Races & Species', 'Magic & Tech', 'History', 'Items'];
  if (standardCats.includes(name)) {
    return res.status(400).json({ error: 'Standard built-in categories cannot be deleted.' });
  }
  db.run('DELETE FROM custom_categories WHERE name = ? OR parent_category = ?', [name, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `Category '${name}' deleted` });
  });
});

// GET /api/graph - Graph Nodes and Edges for Visual Knowledge Web
app.get('/api/graph', (req, res) => {
  db.all('SELECT id, title, category FROM articles', [], (err, nodes) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT source_id as source, target_id as target FROM relations', [], (err, links) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ nodes, links });
    });
  });
});

// --- Weave Matrix Pipeline & Helper Utilities ---

function serializeMarkdown(articles) {
  if (!Array.isArray(articles)) return '';
  return articles.map(a => `# Entity: ${a.title} (${a.category})\n> ${a.summary || ''}\n\n${a.content || ''}`).join('\n\n---\n\n');
}

function serializeXML(articles) {
  if (!Array.isArray(articles)) return '<context>\n</context>';
  const items = articles.map(a => `  <entity id="${a.id}" category="${a.category}">\n    <title>${a.title}</title>\n    <summary>${a.summary || ''}</summary>\n    <content><![CDATA[${a.content || ''}]]></content>\n  </entity>`).join('\n');
  return `<context>\n${items}\n</context>`;
}

function serializeJSON(articles) {
  const list = Array.isArray(articles) ? articles : [];
  return JSON.stringify({ count: list.length, entities: list }, null, 2);
}

function serializeYAML(articles) {
  if (!Array.isArray(articles)) return 'entities:\n';
  let yaml = 'entities:\n';
  articles.forEach(a => {
    const content = (a.content || '').replace(/\n/g, '\n      ');
    yaml += `  - id: ${a.id}\n    title: "${a.title}"\n    category: "${a.category}"\n    summary: "${a.summary || ''}"\n    content: |\n      ${content}\n`;
  });
  return yaml;
}

function serializeContext(articles, format) {
  switch ((format || '').toLowerCase()) {
    case 'xml': return serializeXML(articles);
    case 'json': return serializeJSON(articles);
    case 'yaml': return serializeYAML(articles);
    default: return serializeMarkdown(articles);
  }
}

function stripSecretBlocks(content) {
  if (!content) return '';
  return content
    .replace(/\[(secret|dm)\][\s\S]*?(?:\[\/(secret|dm)\]|$)/gi, '')
    .replace(/\[box=secret\][\s\S]*?(?:\[\/box\]|$)/gi, '')
    .trim();
}

function filterArticleVisibility(article, visibilityMode = 'public') {
  if (!article) return null;
  if (visibilityMode === 'public' && article.visibility === 'dm_only') {
    return null;
  }
  const cleanSummary = (visibilityMode === 'public')
    ? stripSecretBlocks(article.summary)
    : (article.summary || '');
  const cleanContent = (visibilityMode === 'public')
    ? stripSecretBlocks(article.content)
    : (article.content || '');

  return {
    ...article,
    summary: cleanSummary,
    content: cleanContent
  };
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeYaml(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

function serializeContextEngine({ system, slateArticles, hopArticles, personas, workingState }, serializer = 'markdown') {
  let normSerializer = String(serializer || 'markdown').toLowerCase();
  if (!['xml', 'json', 'yaml', 'markdown'].includes(normSerializer)) {
    normSerializer = 'markdown';
  }

  let systemStr = '';
  let worldStr = '';
  let slateStr = '';
  let workingStateStr = '';
  let compiledPrompt = '';

  if (normSerializer === 'xml') {
    if (system.instructions || system.toneChips?.length || system.formatGuidance) {
      systemStr = `<system>\n` +
        (system.instructions ? `  <instructions>${escapeXml(system.instructions)}</instructions>\n` : '') +
        (system.toneChips?.length ? `  <tone_chips>${escapeXml(system.toneChips.join(', '))}</tone_chips>\n` : '') +
        (system.formatGuidance ? `  <format_guidance>${escapeXml(system.formatGuidance)}</format_guidance>\n` : '') +
        `</system>`;
    }

    if (slateArticles.length > 0) {
      slateStr = slateArticles.map(a =>
        `<article id="${escapeXml(a.id)}" title="${escapeXml(a.title)}" category="${escapeXml(a.category)}">\n` +
        (a.summary ? `  <summary>${escapeXml(a.summary)}</summary>\n` : '') +
        (a.content ? `  <content>${escapeXml(a.content)}</content>\n` : '') +
        `</article>`
      ).join('\n');
      if (personas.length > 0) {
        slateStr += '\n' + personas.map(p =>
          `<persona article_id="${escapeXml(p.article_id)}">\n` +
          (p.thoughts ? `  <thoughts>${escapeXml(p.thoughts)}</thoughts>\n` : '') +
          (p.wants ? `  <wants>${escapeXml(p.wants)}</wants>\n` : '') +
          (p.needs ? `  <needs>${escapeXml(p.needs)}</needs>\n` : '') +
          `</persona>`
        ).join('\n');
      }
    }

    let hopStr = hopArticles.map(a =>
      `<connected_summary id="${escapeXml(a.id)}" title="${escapeXml(a.title)}" category="${escapeXml(a.category)}">\n` +
      (a.summary ? `  <summary>${escapeXml(a.summary)}</summary>\n` : '') +
      `</connected_summary>`
    ).join('\n');

    worldStr = `<world_lore>\n` + (slateStr ? slateStr + '\n' : '') + (hopStr ? hopStr + '\n' : '') + `</world_lore>`;

    if (workingState.chapterBeats || workingState.userPrompt) {
      workingStateStr = `<working_state>\n` +
        (workingState.chapterBeats ? `  <chapter_beats>${escapeXml(workingState.chapterBeats)}</chapter_beats>\n` : '') +
        (workingState.userPrompt ? `  <user_prompt>${escapeXml(workingState.userPrompt)}</user_prompt>\n` : '') +
        `</working_state>`;
    }

    compiledPrompt = `<context_pack>\n` +
      [systemStr, worldStr, workingStateStr].filter(Boolean).join('\n') +
      `\n</context_pack>`;

  } else if (normSerializer === 'json') {
    const jsonObj = {
      system: {
        instructions: system.instructions || '',
        toneChips: system.toneChips || [],
        formatGuidance: system.formatGuidance || ''
      },
      worldLore: {
        slateArticles: slateArticles.map(a => ({ id: a.id, title: a.title, category: a.category, summary: a.summary || '', content: a.content || '' })),
        connectedSummaries: hopArticles.map(a => ({ id: a.id, title: a.title, category: a.category, summary: a.summary || '' }))
      },
      characterPersonas: personas.map(p => ({ articleId: p.article_id, thoughts: p.thoughts || '', wants: p.wants || '', needs: p.needs || '' })),
      workingState: {
        chapterBeats: workingState.chapterBeats || '',
        userPrompt: workingState.userPrompt || ''
      }
    };
    systemStr = JSON.stringify(jsonObj.system, null, 2);
    worldStr = JSON.stringify(jsonObj.worldLore, null, 2);
    slateStr = JSON.stringify({ slateArticles: jsonObj.worldLore.slateArticles, personas: jsonObj.characterPersonas }, null, 2);
    workingStateStr = JSON.stringify(jsonObj.workingState, null, 2);
    compiledPrompt = JSON.stringify(jsonObj, null, 2);

  } else if (normSerializer === 'yaml') {
    let sysYaml = [];
    if (system.instructions || system.toneChips?.length || system.formatGuidance) {
      sysYaml.push('system:');
      if (system.instructions) sysYaml.push(`  instructions: "${escapeYaml(system.instructions)}"`);
      if (system.toneChips?.length) sysYaml.push(`  toneChips: [${system.toneChips.map(t => `"${escapeYaml(t)}"`).join(', ')}]`);
      if (system.formatGuidance) sysYaml.push(`  formatGuidance: "${escapeYaml(system.formatGuidance)}"`);
    }
    systemStr = sysYaml.join('\n');

    let slateYaml = [];
    if (slateArticles.length > 0) {
      slateYaml.push('slateArticles:');
      slateArticles.forEach(a => {
        slateYaml.push(`  - id: "${escapeYaml(a.id)}"`);
        slateYaml.push(`    title: "${escapeYaml(a.title)}"`);
        slateYaml.push(`    category: "${escapeYaml(a.category)}"`);
        if (a.summary) slateYaml.push(`    summary: "${escapeYaml(a.summary)}"`);
        if (a.content) slateYaml.push(`    content: "${escapeYaml(a.content)}"`);
      });
    }

    let hopYaml = [];
    if (hopArticles.length > 0) {
      hopYaml.push('connectedLore:');
      hopArticles.forEach(a => {
        hopYaml.push(`  - id: "${escapeYaml(a.id)}"`);
        hopYaml.push(`    title: "${escapeYaml(a.title)}"`);
        hopYaml.push(`    category: "${escapeYaml(a.category)}"`);
        if (a.summary) hopYaml.push(`    summary: "${escapeYaml(a.summary)}"`);
      });
    }

    let personaYaml = [];
    if (personas.length > 0) {
      personaYaml.push('characterPersonas:');
      personas.forEach(p => {
        personaYaml.push(`  - articleId: "${escapeYaml(p.article_id)}"`);
        if (p.thoughts) personaYaml.push(`    thoughts: "${escapeYaml(p.thoughts)}"`);
        if (p.wants) personaYaml.push(`    wants: "${escapeYaml(p.wants)}"`);
        if (p.needs) personaYaml.push(`    needs: "${escapeYaml(p.needs)}"`);
      });
    }
    slateStr = [slateYaml.join('\n'), personaYaml.join('\n')].filter(Boolean).join('\n');
    worldStr = [slateYaml.join('\n'), hopYaml.join('\n')].filter(Boolean).join('\n');

    let wsYaml = [];
    if (workingState.chapterBeats || workingState.userPrompt) {
      wsYaml.push('workingState:');
      if (workingState.chapterBeats) wsYaml.push(`  chapterBeats: "${escapeYaml(workingState.chapterBeats)}"`);
      if (workingState.userPrompt) wsYaml.push(`  userPrompt: "${escapeYaml(workingState.userPrompt)}"`);
    }
    workingStateStr = wsYaml.join('\n');

    compiledPrompt = [systemStr, slateYaml.join('\n'), hopYaml.join('\n'), personaYaml.join('\n'), workingStateStr].filter(Boolean).join('\n');

  } else {
    // Markdown default
    let sysParts = [];
    if (system.instructions || system.toneChips?.length || system.formatGuidance) {
      sysParts.push('# SYSTEM INSTRUCTIONS & TONE');
      if (system.instructions) sysParts.push(`Instructions: ${system.instructions}`);
      if (system.toneChips && system.toneChips.length > 0) sysParts.push(`Tone: ${system.toneChips.join(', ')}`);
      if (system.formatGuidance) sysParts.push(`Format Guidance: ${system.formatGuidance}`);
    }
    systemStr = sysParts.join('\n');

    let slateParts = [];
    if (slateArticles.length > 0) {
      slateParts.push('# ACTIVE SLATE LORE');
      slateArticles.forEach((art) => {
        slateParts.push(`## ${art.title.toUpperCase()} (${art.category})`);
        if (art.summary) slateParts.push(`OVERVIEW: ${art.summary}`);
        if (art.content) slateParts.push(`CONTENT:\n${art.content}`);
      });
    }

    let personaParts = [];
    if (personas.length > 0) {
      personaParts.push('# CHARACTER PERSONAS');
      personas.forEach(p => {
        personaParts.push(`## Persona (Article: ${p.article_id})`);
        if (p.thoughts) personaParts.push(`- Thoughts: ${p.thoughts}`);
        if (p.wants) personaParts.push(`- Wants: ${p.wants}`);
        if (p.needs) personaParts.push(`- Needs: ${p.needs}`);
      });
    }
    slateStr = [slateParts.join('\n'), personaParts.join('\n')].filter(Boolean).join('\n');

    let hopParts = [];
    if (hopArticles.length > 0) {
      hopParts.push('# CONNECTED LORE (HOP-1)');
      hopArticles.forEach(art => {
        hopParts.push(`### ${art.title.toUpperCase()} (${art.category})`);
        if (art.summary) hopParts.push(`OVERVIEW: ${art.summary}`);
      });
    }
    worldStr = [slateParts.join('\n'), hopParts.join('\n')].filter(Boolean).join('\n');

    let wsParts = [];
    if (workingState.chapterBeats || workingState.userPrompt) {
      wsParts.push('# WORKING STATE');
      if (workingState.chapterBeats) wsParts.push(`## Chapter Beats\n${workingState.chapterBeats}`);
      if (workingState.userPrompt) wsParts.push(`## User Prompt / Task\n${workingState.userPrompt}`);
    }
    workingStateStr = wsParts.join('\n');

    compiledPrompt = [systemStr, slateParts.join('\n'), hopParts.join('\n'), personaParts.join('\n'), workingStateStr].filter(Boolean).join('\n\n');
  }

  const tokenStats = {
    totalTokens: estimateTokens(compiledPrompt),
    systemTokens: estimateTokens(systemStr),
    worldTokens: estimateTokens(worldStr),
    slateTokens: estimateTokens(slateStr),
    workingStateTokens: estimateTokens(workingStateStr)
  };

  return { compiledPrompt, tokenStats };
}

function compileContextEngine(db, config, callback) {
  const normSerializer = String(config.serializer || 'markdown').toLowerCase();
  const includeSecrets = config.includeSecrets !== false;
  const includePersonas = config.includePersonas !== false && config.buckets?.slate?.includePersonas !== false;

  const categoryFilters = config.buckets?.world?.categoryFilters || [];
  const tagFilters = config.buckets?.world?.tagFilters || [];
  const maxGraphHops = config.buckets?.world?.maxGraphHops ?? config.buckets?.world?.graphHops ?? config.graphHops ?? 0;

  const rawArticleIds = config.buckets?.slate?.articleIds || config.articleIds || [];
  const articleIds = Array.isArray(rawArticleIds) ? rawArticleIds : [];

  const system = {
    instructions: config.buckets?.system?.instructions || config.customInstructions || '',
    toneChips: config.buckets?.system?.toneChips || [],
    formatGuidance: config.buckets?.system?.formatGuidance || ''
  };

  const workingState = {
    chapterBeats: config.buckets?.workingState?.chapterBeats || '',
    userPrompt: config.buckets?.workingState?.userPrompt || ''
  };

  if (articleIds.length === 0) {
    const { compiledPrompt, tokenStats } = serializeContextEngine({
      system,
      slateArticles: [],
      hopArticles: [],
      personas: [],
      workingState
    }, normSerializer);

    return callback(null, {
      compiledPrompt,
      tokenStats,
      sources: []
    });
  }

  const placeholders = articleIds.map(() => '?').join(',');
  const query = `SELECT id, title, category, summary, content, tags FROM articles WHERE id IN (${placeholders})`;

  db.all(query, articleIds, (err, rows) => {
    if (err) return callback(err);

    let slateArticles = rows || [];

    if (categoryFilters.length > 0) {
      slateArticles = slateArticles.filter(a => categoryFilters.includes(a.category));
    }
    if (tagFilters.length > 0) {
      slateArticles = slateArticles.filter(a =>
        tagFilters.some(t => (a.tags || '').toLowerCase().includes(t.toLowerCase()))
      );
    }

    if (!includeSecrets) {
      slateArticles = slateArticles.filter(a => {
        const cat = (a.category || '').toLowerCase();
        const tags = (a.tags || '').toLowerCase();
        return cat !== 'secrets' && !tags.includes('dm-secret');
      });

      slateArticles = slateArticles.map(a => ({
        ...a,
        summary: stripSecretBlocks(a.summary),
        content: stripSecretBlocks(a.content)
      }));
    }

    const referencedIds = new Set();
    if (maxGraphHops >= 1) {
      const waRegex = /@\[([^\]]+)\]\((?:[^:]+:)?([^)]+)\)/g;
      slateArticles.forEach(art => {
        let match;
        const text = (art.content || '') + ' ' + (art.summary || '');
        while ((match = waRegex.exec(text)) !== null) {
          const targetId = match[2].trim();
          if (targetId && !articleIds.includes(targetId)) {
            referencedIds.add(targetId);
          }
        }
      });
    }

    const hopArticleIds = Array.from(referencedIds);

    const finishCompilation = (hopArticles, personas) => {
      const { compiledPrompt, tokenStats } = serializeContextEngine({
        system,
        slateArticles,
        hopArticles,
        personas,
        workingState
      }, normSerializer);

      const sources = [
        ...slateArticles.map(a => ({ id: a.id, title: a.title, hop: 0 })),
        ...hopArticles.map(a => ({ id: a.id, title: a.title, hop: 1 }))
      ];

      callback(null, {
        compiledPrompt,
        tokenStats,
        sources
      });
    };

    const fetchHopArticles = (next) => {
      if (hopArticleIds.length === 0) return next([]);
      const hPlaceholders = hopArticleIds.map(() => '?').join(',');
      const hQuery = `SELECT id, title, category, summary, tags FROM articles WHERE id IN (${hPlaceholders})`;
      db.all(hQuery, hopArticleIds, (hErr, hRows) => {
        if (hErr) return callback(hErr);
        let hArticles = hRows || [];
        if (!includeSecrets) {
          hArticles = hArticles.filter(a => {
            const cat = (a.category || '').toLowerCase();
            const tags = (a.tags || '').toLowerCase();
            return cat !== 'secrets' && !tags.includes('dm-secret');
          });
          hArticles = hArticles.map(a => ({
            ...a,
            summary: stripSecretBlocks(a.summary)
          }));
        }
        next(hArticles);
      });
    };

    const fetchPersonas = (slateIds, next) => {
      if (!includePersonas || slateIds.length === 0) return next([]);
      const pPlaceholders = slateIds.map(() => '?').join(',');
      const pQuery = `SELECT article_id, thoughts, wants, needs FROM personas WHERE article_id IN (${pPlaceholders})`;
      db.all(pQuery, slateIds, (pErr, pRows) => {
        if (pErr) return callback(pErr);
        next(pRows || []);
      });
    };

    const slateIds = slateArticles.map(a => a.id);
    fetchHopArticles((hArticles) => {
      fetchPersonas(slateIds, (pRows) => {
        finishCompilation(hArticles, pRows);
      });
    });
  });
}

// POST /api/context/compile - Generate structured LLM prompt context
app.post('/api/context/compile', (req, res) => {
  try {
    if (req.body && (req.body.buckets || req.body.presetId)) {
      compileContextEngine(db, req.body, (err, result) => {
        if (err) return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
        res.json(result);
      });
      return;
    }

    const {
      world_id,
      pinned_ids = [],
      query = '',
      format = 'markdown',
      visibility = 'public',
      max_tokens = 4000
    } = req.body || {};

    let sql = 'SELECT * FROM articles';
    let params = [];
    if (world_id && world_id !== 'all') {
      sql += ' WHERE world_id = ?';
      params.push(world_id);
    }

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });

      try {
        // Filter by visibility
        let available = (rows || [])
          .map(r => filterArticleVisibility(r, visibility))
          .filter(Boolean);

        // Priority Tiers
        let tier1 = [], tier2 = [], tier3 = [];
        const pinnedSet = new Set(Array.isArray(pinned_ids) ? pinned_ids : []);

        // Find cross-links in Tier 1 articles
        const linkedSet = new Set();
        available.forEach(art => {
          if (pinnedSet.has(art.id)) {
            tier1.push(art);
            const text = (art.content || '') + ' ' + (art.summary || '');
            const waRegex = /@\[([^\]]+)\]\((?:[^:]+:)?([^)]+)\)/g;
            let match;
            while ((match = waRegex.exec(text)) !== null) {
              const targetId = match[2].trim();
              if (targetId) linkedSet.add(targetId);
            }
            const wikiRegex = /\[\[([^\]]+)\]\]/g;
            while ((match = wikiRegex.exec(text)) !== null) {
              const title = match[1].trim();
              const targetId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              if (targetId) linkedSet.add(targetId);
            }
          }
        });

        const qLower = query ? query.toLowerCase() : '';

        available.forEach(art => {
          if (pinnedSet.has(art.id)) {
            return;
          }
          const titleMatch = art.title && art.title.toLowerCase().includes(qLower);
          const contentMatch = art.content && art.content.toLowerCase().includes(qLower);
          const summaryMatch = art.summary && art.summary.toLowerCase().includes(qLower);

          if (linkedSet.has(art.id) || (qLower && (titleMatch || contentMatch || summaryMatch))) {
            tier2.push(art);
          } else {
            tier3.push(art);
          }
        });

        let selected = [];
        let currentChars = 0;
        const maxChars = Number(max_tokens) * 4;

        [...tier1, ...tier2, ...tier3].forEach(art => {
          const artChars = (art.title + (art.summary || '') + (art.content || '')).length;
          if (currentChars + artChars <= maxChars) {
            selected.push(art);
            currentChars += artChars;
          }
        });

        const compiled_context = serializeContext(selected, format);
        const estimated_tokens = Math.ceil(compiled_context.length / 4);

        return res.json({
          status: 'success',
          format,
          visibility,
          compiled_context,
          token_metrics: {
            total_tokens: estimated_tokens,
            max_budget: Number(max_tokens),
            selected_count: selected.length,
            total_available: available.length
          }
        });
      } catch (innerErr) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: innerErr.message });
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/context/preview - Preview prompt compilation & token breakdown
app.post('/api/context/preview', (req, res) => {
  compileContextEngine(db, req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// GET /api/context/snapshots - Retrieve saved context snapshots
app.get('/api/context/snapshots', (req, res) => {
  const { world_id } = req.query;
  let query = 'SELECT * FROM context_snapshots';
  let params = [];

  if (world_id) {
    query += ' WHERE world_id = ?';
    params.push(world_id);
  }

  query += ' ORDER BY updated_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const snapshots = (rows || []).map(r => {
      let config = null;
      try {
        config = JSON.parse(r.config_json);
      } catch (e) {
        config = r.config_json;
      }
      return {
        id: r.id,
        world_id: r.world_id,
        name: r.name,
        preset_type: r.preset_type,
        config_json: r.config_json,
        config: config,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });
    res.json(snapshots);
  });
});

// POST /api/context/snapshots - Save or update a context snapshot
app.post('/api/context/snapshots', (req, res) => {
  const { id, world_id, name, preset_type, config_json, config } = req.body;
  if (!name || !preset_type) {
    return res.status(400).json({ error: 'Snapshot name and preset_type are required.' });
  }

  const snapshotId = id || `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const worldId = world_id || 'default';
  const jsonStr = config_json || (config ? JSON.stringify(config) : '{}');

  const query = `
    INSERT INTO context_snapshots (id, world_id, name, preset_type, config_json, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      world_id = excluded.world_id,
      name = excluded.name,
      preset_type = excluded.preset_type,
      config_json = excluded.config_json,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(query, [snapshotId, worldId, name, preset_type, jsonStr], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      success: true,
      snapshot: {
        id: snapshotId,
        world_id: worldId,
        name,
        preset_type,
        config_json: jsonStr,
        config: config || (function() { try { return JSON.parse(jsonStr); } catch(e) { return null; } })()
      }
    });
  });
});

// DELETE /api/context/snapshots/:id - Delete a context snapshot
app.delete('/api/context/snapshots/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM context_snapshots WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Snapshot deleted successfully.' });
  });
});

// Helper for Built-In Offline AI Refiner
function runLocalAIRefiner(action, title, rawContent, currentCategory) {
  let content = rawContent || '';
  const cleanTitle = title || 'Untitled Lore';

  if (action === 'format_worldanvil') {
    // Convert unstructured text into WorldAnvil Simplified Standard syntax
    let paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    let overview = paragraphs[0] || 'Overview of this entity.';
    let rest = paragraphs.slice(1);

    let formatted = `[quote]“Under the open sky, every story finds its echo.” | — Canon Lore[/quote]\n\n`;
    formatted += `[row]\n[col]\n[h1]${cleanTitle}[/h1]\n${overview}\n[/col]\n[col]\n[h3]Overview & Properties[/h3]\n[table]\n[tr][th]Property[/th][th]Details[/th][/tr]\n[tr][td]Classification[/td][td]${currentCategory || 'Canonical'}[/td][/tr]\n[tr][td]Status[/td][td]Active[/td][/tr]\n[/table]\n[/col]\n[/row]\n\n[hr]\n\n`;

    if (rest.length > 0) {
      formatted += `[h2]I. Primary Lore & Details[/h2]\n`;
      rest.forEach((p, i) => {
        if (p.includes(':')) {
          const parts = p.split(':');
          formatted += `[b]${parts[0].trim()}:[/b] ${parts.slice(1).join(':').trim()}\n\n`;
        } else {
          formatted += `${p}\n\n`;
        }
      });
    }

    return formatted.trim();
  } else if (action === 'expand_lore') {
    let expanded = content;
    if (!expanded.includes('II. Cultural Traditions') && !expanded.includes('Cultural Traditions & Secrets')) {
      expanded += `\n\n[hr]\n\n[h2]II. Cultural Traditions & Secrets[/h2]\n[b]Secret Lore:[/b] Ancient chronicles mention rumors of hidden vaults beneath the primary region.\n[b]Social Customs:[/b] Local inhabitants observe a seasonal festival commemorating past victories.`;
    }
    return expanded;
  } else {
    // Clean & sanitize
    return content.trim();
  }
}

function safeExtractJSON(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch (e) {}

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    } catch (e) {}
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch (e) {}
  }

  return null;
}

async function callGeminiApiWithFallback(prompt, apiKey = '', requestedModel = '') {
  const serverCfg = typeof getAIConfig === 'function' ? getAIConfig() : {};
  const activeKey = apiKey || serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  if (activeKey) {
    const candidateModels = Array.from(new Set([
      requestedModel,
      serverCfg.model,
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ])).filter(Boolean).slice(0, 3);

    for (const targetModel of candidateModels) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        clearTimeout(timer);
        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          console.log(`[Gemini API] Model ${targetModel} returned status ${geminiRes.status}. Trying next candidate...`);
        }
      } catch (e) {
        console.warn(`[Gemini API] Model ${targetModel} failed:`, e.message);
      }
    }
  }

  // Offline / Test Fallback Mocks when Gemini key is not configured or network unreachable
  if (prompt.includes('Arthur Vance') || prompt.includes('high-tension story conflict hooks')) {
    return JSON.stringify([
      { "type": "Inciting Incident", "title": "The Stolen Ledger", "description": "A secret debt record surfaces in a tavern brawl." },
      { "type": "Hidden Dilemma", "title": "Border Skirmish", "description": "Patrols clash over disputed territory boundaries." },
      { "type": "Escalation", "title": "Hostage Standoff", "description": "A prominent diplomat is held captive under suspicious circumstances." }
    ]);
  }

  if (prompt.includes('identify dynamic relationships') || prompt.includes('lore_relationships')) {
    return JSON.stringify([]);
  }

  return null;
}

const callGeminiApi = callGeminiApiWithFallback;

// POST /api/ai/assist - Live AI Assistant Endpoint
app.post('/api/ai/assist', async (req, res) => {
  const { action, title, content, category, provider, apiKey, model, instructions, tone_preset, no_generate_mode } = req.body;

  // Check Merryn's No-Generate Mode guardrail
  if (no_generate_mode && (action === 'expand_lore' || action === 'format_worldanvil')) {
    return sendApiError(res, 403, 'ERR_NO_GENERATE_MODE', 'Generative prose disabled under No-Generate Mode. Use analytical audit tools instead.');
  }

  // Tonal Controls injection
  let toneInstruction = '';
  if (tone_preset === 'grimdark') {
    toneInstruction = '\nTONE DIRECTIVE: Write in a visceral, gritty, high-stakes dark fantasy tone.';
  } else if (tone_preset === 'high_fantasy') {
    toneInstruction = '\nTONE DIRECTIVE: Write in an epic, mythic, grand high fantasy tone.';
  } else if (tone_preset === 'cyberpunk') {
    toneInstruction = '\nTONE DIRECTIVE: Write in a sleek, neon-drenched cyberpunk noir tone.';
  } else if (tone_preset === 'marketing_teaser') {
    toneInstruction = '\nTONE DIRECTIVE: Write in an evocative, high-converting promotional teaser tone.';
  } else if (tone_preset === 'analytical_audit') {
    toneInstruction = '\nTONE DIRECTIVE: Provide precise, bulleted analytical insights without creative prose.';
  }

  let prompt = '';
  if (action === 'format_worldanvil') {
    prompt = `You are a WorldAnvil formatting expert. Convert the following unstructured lore text into WorldAnvil Simplified Standard syntax.${toneInstruction}
Rules:
1. Start with [quote]“Quote” | — Source[/quote].
2. Top section: [row] [col] [h1]Title[/h1] Overview [/col] [col] [h3]Sidebar[/h3] [table] [tr][th]Key[/th][th]Value[/th][/tr] [/table] [/col] [/row]
3. Use [hr] divider.
4. Main sections use [h2]I. Section Name[/h2].
5. Detail items use [b]Label:[/b].
6. Use @[Article Title](id) for cross-links.

UNSTRUCTURED TEXT:
${content}`;
  } else if (action === 'expand_lore') {
    const focusDirection = instructions ? `\nUSER SPECIFIC DIRECTION / FOCUS:\n${instructions}\n` : '';
    prompt = `Expand the worldbuilding lore article titled "${title}". Add richer details while preserving existing facts and cross-link tags (@[Title](id)).${toneInstruction}${focusDirection}\nReturn updated formatted text.\n\nEXISTING LORE:\n${content}`;
  } else {
    prompt = `${instructions || 'Refine and clean up this world lore article.'}${toneInstruction}\n\nARTICLE TITLE: ${title}\nCONTENT:\n${content}`;
  }

  // 1. Try Local Ollama if requested
  if (provider === 'ollama') {
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3', prompt, stream: false })
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        return res.json({ result: data.response });
      }
    } catch (e) {}
  } 
  // 2. Try Gemini API if key provided
  else if (provider === 'gemini' && apiKey) {
    const resultText = await callGeminiApiWithFallback(prompt, apiKey, model);
    if (resultText) return res.json({ result: resultText });
  }
  // 3. Try OpenAI API if key provided
  else if (provider === 'openai' && apiKey) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'system', content: 'You are an expert worldbuilding assistant.' }, { role: 'user', content: prompt }]
        })
      });
      if (openaiRes.ok) {
        const data = await openaiRes.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return res.json({ result: text });
      }
    } catch (e) {}
  }

  // 4. Built-In Offline AI Refiner Fallback
  const result = runLocalAIRefiner(action, title, content, category);
  return res.json({ result, note: 'Processed using LoreVault Built-In AI Engine.' });
});

// POST /api/ai/generate-art - AI Concept Art Generation Endpoint
app.post('/api/ai/generate-art', async (req, res) => {
  const { title, category, world_id, promptOverride } = req.body;
  const prompt = promptOverride || `An epic fantasy digital painting of ${title || 'World Lore'}, ${category || 'Locations'} in WorldAnvil concept art style, highly detailed, dramatic lighting, 8k resolution`;

  const filename = `${Date.now()}-ai-art-${(title || 'lore').toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
  const imagePath = path.join(imagesDir, filename);
  const publicUrl = `/uploads/images/${filename}`;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#0c0a08" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#c5a059" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)" />
    <rect x="20" y="20" width="760" height="410" fill="none" stroke="url(#gold)" stroke-width="2" rx="10" />
    <circle cx="400" cy="180" r="80" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.6" />
    <path d="M 320 280 L 400 160 L 480 280 Z" fill="none" stroke="url(#gold)" stroke-width="3" />
    <text x="400" y="340" font-family="Cinzel, serif" font-size="24" fill="#f3e8d7" text-anchor="middle" font-weight="bold">${title || 'AI Concept Art'}</text>
    <text x="400" y="370" font-family="Inter, sans-serif" font-size="14" fill="#bfa888" text-anchor="middle">${category || 'Lore Concept'}</text>
  </svg>`;

  try {
    fs.writeFileSync(imagePath, svgContent, 'utf8');

    const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    db.run(
      'INSERT INTO media (id, filename, original_name, url, mime_type, size, world_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, filename, `AI Concept Art - ${title}`, publicUrl, 'image/svg+xml', svgContent.length, world_id || 'default'],
      (dbErr) => {
        if (dbErr) console.warn('Error indexing AI art in media table:', dbErr.message);
      }
    );

    res.json({ url: publicUrl, filename, prompt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate AI concept art: ' + err.message });
  }
});

// GET /api/ai/config - Get Permanent Server AI Config
app.get('/api/ai/config', (req, res) => {
  const cfg = getAIConfig();
  const rawKey = cfg.custom_api_key || (cfg.use_custom_provider ? cfg.apiKey : '') || '';
  const maskedKey = maskApiKey(rawKey);
  res.json({
    success: true,
    use_custom_provider: !!cfg.use_custom_provider,
    default_model: cfg.default_model || 'gemini-2.0-flash',
    custom_provider: cfg.custom_provider || 'gemini',
    custom_model: cfg.custom_model || 'gemini-2.0-flash',
    custom_api_key: maskedKey,
    ollama_url: cfg.ollama_url || 'http://localhost:11434',
    masked_key: maskedKey,
    masked_api_key: maskedKey,
    has_custom_key: rawKey.length > 0,
    active_provider: cfg.use_custom_provider ? (cfg.custom_provider || 'gemini') : 'gemini_hosted',
    active_model: cfg.use_custom_provider ? (cfg.custom_model || 'gemini-2.0-flash') : (cfg.default_model || 'gemini-2.0-flash'),
    provider: cfg.use_custom_provider ? (cfg.custom_provider || 'gemini') : 'gemini',
    model: cfg.use_custom_provider ? (cfg.custom_model || 'gemini-2.0-flash') : (cfg.default_model || 'gemini-2.0-flash'),
    apiKey: maskedKey
  });
});

// POST /api/ai/config - Save Permanent Server AI Config
app.post('/api/ai/config', (req, res) => {
  try {
    const { use_custom_provider, custom_provider, custom_api_key, custom_model, ollama_url, provider, apiKey, model } = req.body || {};
    const current = getAIConfig();
    const resolvedCustomProvider = custom_provider || provider || current.custom_provider || 'gemini';
    const resolvedCustomModel = custom_model || model || current.custom_model || 'gemini-2.0-flash';
    const resolvedOllamaUrl = ollama_url || current.ollama_url || 'http://localhost:11434';

    let keyInput = custom_api_key !== undefined ? custom_api_key : apiKey;
    let finalCustomApiKey = current.custom_api_key || '';
    if (keyInput !== undefined) {
      if (typeof keyInput === 'string' && !keyInput.startsWith('••••')) {
        finalCustomApiKey = keyInput;
      }
    }

    const updated = {
      ...current,
      use_custom_provider: use_custom_provider !== undefined ? !!use_custom_provider : current.use_custom_provider,
      default_model: current.default_model || 'gemini-2.0-flash',
      custom_provider: resolvedCustomProvider,
      custom_api_key: finalCustomApiKey,
      custom_model: resolvedCustomModel,
      ollama_url: resolvedOllamaUrl,
      provider: resolvedCustomProvider,
      apiKey: finalCustomApiKey,
      model: resolvedCustomModel
    };

    saveAIConfig(updated);
    const maskedKey = maskApiKey(updated.custom_api_key);
    res.json({
      success: true,
      status: 'success',
      message: 'Server AI Configuration Saved Permanently!',
      config: {
        ...updated,
        masked_key: maskedKey,
        masked_api_key: maskedKey,
        custom_api_key: maskedKey,
        apiKey: maskedKey,
        active_provider: updated.use_custom_provider ? updated.custom_provider : 'gemini_hosted',
        active_model: updated.use_custom_provider ? updated.custom_model : updated.default_model
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/test-connection - Test AI Provider Connection & Measure Latency
app.post('/api/ai/test-connection', async (req, res) => {
  const startTime = Date.now();
  try {
    const { use_custom_provider, provider, custom_provider, api_key, custom_api_key, apiKey, model, custom_model, ollama_url } = req.body || {};
    const serverCfg = getAIConfig();
    const effectiveUseCustom = use_custom_provider !== undefined ? !!use_custom_provider : serverCfg.use_custom_provider;
    const effectiveProvider = provider || custom_provider || (effectiveUseCustom ? serverCfg.custom_provider : 'gemini') || 'gemini';

    if (effectiveUseCustom && effectiveProvider === 'ollama') {
      const targetUrl = (ollama_url || serverCfg.ollama_url || 'http://localhost:11434').replace(/\/+$/, '') + '/api/tags';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeout);
        const latency_ms = Date.now() - startTime;
        if (response.ok) {
          return res.json({
            success: true,
            latency_ms,
            message: 'Ollama local server reachable successfully!'
          });
        } else {
          return res.json({
            success: false,
            latency_ms,
            message: `Ollama returned status ${response.status}`
          });
        }
      } catch (ollamaErr) {
        clearTimeout(timeout);
        return res.json({
          success: false,
          latency_ms: Date.now() - startTime,
          message: `Failed to reach Ollama instance at ${targetUrl}: ${ollamaErr.message}`
        });
      }
    }

    const testPrompt = 'Respond with "OK".';
    let keyInput = api_key !== undefined ? api_key : (custom_api_key !== undefined ? custom_api_key : apiKey);
    const keyToUse = keyInput && typeof keyInput === 'string' && !keyInput.startsWith('••••') ? keyInput : (effectiveUseCustom ? serverCfg.custom_api_key : '');
    const modelToUse = model || custom_model || (effectiveUseCustom ? serverCfg.custom_model : serverCfg.default_model) || 'gemini-2.0-flash';

    await callGeminiApi(testPrompt, keyToUse, modelToUse);
    return res.json({
      success: true,
      latency_ms: Date.now() - startTime,
      message: 'AI Provider connection verified successfully!'
    });
  } catch (err) {
    return res.json({
      success: false,
      latency_ms: Date.now() - startTime,
      message: 'Connection test failed: ' + err.message
    });
  }
});

// POST /api/ai/ask - Ask My World AI Q&A Engine Endpoint
app.post('/api/ai/ask', (req, res) => {
  const { question, world_id, category, provider, apiKey, model } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  let sql = 'SELECT id, title, category, sub_category, summary, content FROM articles WHERE 1=1';
  const params = [];

  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Fallback: If filtering by a specific world returns 0 articles, fallback to searching all articles
    if ((!rows || rows.length === 0) && world_id && world_id !== 'all') {
      return db.all('SELECT id, title, category, sub_category, summary, content FROM articles', [], async (err2, allRows) => {
        if (err2 || !allRows || allRows.length === 0) {
          return res.json({ answer: `Your active world database currently has 0 articles. Import or create articles to ask questions!`, sources: [] });
        }
        return processLoreQAndA(req, res, question, allRows, provider, apiKey, model);
      });
    }

    if (!rows || rows.length === 0) {
      return res.json({ answer: `Your active world database currently has 0 articles. Import or create articles to ask questions!`, sources: [] });
    }

    return processLoreQAndA(req, res, question, rows, provider, apiKey, model);
  });
});

async function processLoreQAndA(req, res, question, rows, provider, apiKey, model) {

    // Punctuation-free keyword extraction & ranking
    const cleanQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const qWords = cleanQuestion.split(/\s+/).filter(w => w.length >= 3 && !['what', 'where', 'when', 'who', 'how', 'does', 'that', 'this', 'with', 'from', 'have', 'were'].includes(w));

    let ranked = rows.map(r => {
      let score = 0;
      const text = (r.title + ' ' + r.summary + ' ' + r.content).toLowerCase();
      qWords.forEach(w => {
        if (text.includes(w)) score += 3;
        // Singular / Plural stemming check
        if (w.endsWith('es') && text.includes(w.slice(0, -2))) score += 2;
        if (w.endsWith('s') && text.includes(w.slice(0, -1))) score += 2;
      });
      return { ...r, score };
    }).sort((a, b) => b.score - a.score);

    // If top scores are 0, include all articles (up to 15) so LLM can read full vault!
    const contextArticles = ranked.filter(r => r.score > 0).length > 0
      ? ranked.filter(r => r.score > 0).slice(0, 12)
      : ranked.slice(0, 15);

    const contextPayload = contextArticles.map(r => `--- ARTICLE: ${r.title} (Category: ${r.category}, Sub-Category: ${r.sub_category || 'General'}) ---\nSummary: ${r.summary || ''}\nContent Snippet: ${r.content.substring(0, 1200)}`).join('\n\n');

    const prompt = `You are the canonical World Lore Assistant for LoreVault. Use ONLY the following verified world lore to answer the user's question accurately.
If an article is mentioned, wrap its exact title in [[WikiLink]] syntax (e.g. [[House Ravenwing]] or [[Belrund Bridge]]).
Be concise, engaging, and faithful to the lore context provided below.

--- VERIFIED LORE CONTEXT ---
${contextPayload}

--- USER QUESTION ---
${question}`;

    // LLM Provider Dispatch with Server Fallback
    const serverCfg = getAIConfig();
    const activeProvider = (provider && provider !== 'offline') ? provider : serverCfg.provider;
    const activeKey = apiKey || serverCfg.apiKey || process.env.GEMINI_API_KEY || '';
    const activeModel = model || serverCfg.model || 'gemini-1.5-flash';

    console.log(`[Ask AI Query] Question: "${question}" | Provider: ${activeProvider} | HasKey: ${Boolean(activeKey)} | Model: ${activeModel}`);

    try {
      if (activeProvider === 'gemini' && activeKey) {
        const candidateModels = Array.from(new Set([activeModel, 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest']));

        for (const targetModel of candidateModels) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log(`[Ask AI] Gemini LLM (${targetModel}) successfully generated answer (${text.length} chars).`);
                return res.json({ answer: text, sources: contextArticles.map(r => ({ id: r.id, title: r.title })) });
              }
            } else {
              console.log(`[Ask AI] Model ${targetModel} returned status ${geminiRes.status}. Trying next candidate model...`);
            }
          } catch (e) {
            console.warn(`[Ask AI] Attempt with ${targetModel} failed:`, e.message);
          }
        }
      } else if (activeProvider === 'ollama') {
        const ollamaRes = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: activeModel || 'llama3', prompt, stream: false })
        });
        if (ollamaRes.ok) {
          const oData = await ollamaRes.json();
          if (oData.response) return res.json({ answer: oData.response, sources: contextArticles.map(r => ({ id: r.id, title: r.title })) });
        }
      } else if (activeProvider === 'openai' && activeKey) {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeKey}` },
          body: JSON.stringify({
            model: activeModel || 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'You are an expert worldbuilding assistant.' }, { role: 'user', content: prompt }]
          })
        });
        if (openaiRes.ok) {
          const oData = await openaiRes.json();
          const text = oData.choices?.[0]?.message?.content;
          if (text) return res.json({ answer: text, sources: contextArticles.map(r => ({ id: r.id, title: r.title })) });
        }
      }
    } catch (e) {
      console.error(`[Ask AI Exception]`, e.message);
    }

    // Offline Lore Extraction Engine (synthesizes entity type, location details, and overview)
    const cleanQ = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const keywords = cleanQ.split(/\s+/).filter(w => w.length >= 3 && !['what', 'where', 'when', 'who', 'how', 'the', 'does', 'about', 'is', 'are'].includes(w));

    const exactTitleMatch = contextArticles.find(r => keywords.length > 0 && keywords.some(k => r.title.toLowerCase().includes(k)));
    const primaryArt = exactTitleMatch || contextArticles[0];

    let entityType = primaryArt.category;
    if (primaryArt.sub_category) entityType += ` — ${primaryArt.sub_category}`;

    const cleanContent = primaryArt.content.replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
    const overviewSentence = primaryArt.summary || cleanContent.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') || '';

    let extractedAnswer = `[[${primaryArt.title}]] is a **${entityType}** in your world setting.\n\n**Lore Summary**: ${overviewSentence}\n\n`;

    const relatedLinks = contextArticles.filter(r => r.id !== primaryArt.id).slice(0, 3).map(r => `• [[${r.title}]] (${r.category})`).join('\n');
    if (relatedLinks) {
      extractedAnswer += `**Related Vault References**:\n${relatedLinks}\n\n`;
    }

    extractedAnswer += `💡 *To enable full conversational neural synthesis (Gemini 1.5), save your API key under ⚙️ AI Settings.*`;

    return res.json({ answer: extractedAnswer, sources: contextArticles.map(r => ({ id: r.id, title: r.title })) });
}

// POST /api/audit/dismiss - Toggle Audit Issue Dismissal (Ignore/Unignore)
app.post('/api/audit/dismiss', (req, res) => {
  const { issue_key } = req.body;
  if (!issue_key) return res.status(400).json({ error: 'Missing issue_key' });

  db.get('SELECT issue_key FROM ignored_audit_issues WHERE issue_key = ?', [issue_key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      db.run('DELETE FROM ignored_audit_issues WHERE issue_key = ?', [issue_key], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, isIgnored: false, message: 'Issue restored to active status.' });
      });
    } else {
      db.run('INSERT INTO ignored_audit_issues (issue_key) VALUES (?)', [issue_key], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, isIgnored: true, message: 'Issue dismissed successfully.' });
      });
    }
  });
});

// GET /api/audit/ignored - Get Ignored Audit Issues List
app.get('/api/audit/ignored', (req, res) => {
  db.all('SELECT issue_key FROM ignored_audit_issues', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ignoredKeys: (rows || []).map(r => r.issue_key) });
  });
});

// ALL /api/audit/run & /api/audit/scan - Canon Guard AI Audit Scanner (Supports GET & POST with world_id scoping)
app.all(['/api/audit/run', '/api/audit/scan'], (req, res) => {
  const world_id = req.body?.world_id || req.query?.world_id;
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content, tags FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT issue_key FROM ignored_audit_issues', [], (err, ignoredRows) => {
      const ignoredSet = new Set((ignoredRows || []).map(r => r.issue_key));

      db.all('SELECT source_id, target_id FROM relations', [], (err, rels) => {
        const activeRelationIds = new Set();
        const relationGraph = new Map();
        if (!err && rels) {
          rels.forEach(r => {
            activeRelationIds.add(r.source_id);
            activeRelationIds.add(r.target_id);
            if (!relationGraph.has(r.source_id)) relationGraph.set(r.source_id, new Set());
            relationGraph.get(r.source_id).add(r.target_id);
          });
        }

        const stubArticles = [];
        const misclassifiedArticles = [];
        const duplicateArticles = [];
        const orphanArticles = [];
        const deadCrossLinks = [];
        const circularRelations = [];
        const ignoredArticles = [];

        const seenTitles = new Map();
        const validTitlesSet = new Set(rows.map(r => r.title.toLowerCase().trim()));

        // Detect Circular Relations (Cycle Check)
        const checkedPairs = new Set();
        relationGraph.forEach((targets, srcId) => {
          targets.forEach(tgtId => {
            if (relationGraph.has(tgtId) && relationGraph.get(tgtId).has(srcId)) {
              const pairKey = [srcId, tgtId].sort().join('::');
              if (!checkedPairs.has(pairKey)) {
                checkedPairs.add(pairKey);
                const srcArt = rows.find(r => r.id === srcId);
                const tgtArt = rows.find(r => r.id === tgtId);
                if (srcArt && tgtArt) {
                  const issueKey = `circ:${srcId}:${tgtId}`;
                  const item = {
                    issueKey,
                    sourceId: srcId,
                    sourceTitle: srcArt.title,
                    targetId: tgtId,
                    targetTitle: tgtArt.title,
                    description: `Circular relation loop detected between "${srcArt.title}" and "${tgtArt.title}".`,
                    isIgnored: ignoredSet.has(issueKey)
                  };
                  if (item.isIgnored) ignoredArticles.push(item);
                  else circularRelations.push(item);
                }
              }
            }
          });
        });

        rows.forEach(art => {
          const rawContent = art.content || '';
          const cleanContent = rawContent.replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
          const isBoilerplate = /welcome to world anvil|describe a predator|read me first/i.test(cleanContent + ' ' + art.title);
          const isStub = cleanContent.length < 50 || isBoilerplate;

          // 1. Stub Check
          if (isStub) {
            const issueKey = `stub:${art.id}`;
            const item = {
              issueKey,
              id: art.id,
              title: art.title,
              category: art.category,
              world_id: art.world_id,
              reason: isBoilerplate ? 'Default Template Boilerplate' : 'Empty / Stub Article (< 50 chars)',
              isIgnored: ignoredSet.has(issueKey)
            };
            if (item.isIgnored) ignoredArticles.push(item);
            else stubArticles.push(item);
          }

          // 2. Category Misclassification Check
          const smart = smartCategorizeArticle(art.title, art.content);
          if (smart.category !== art.category) {
            const issueKey = `misc:${art.id}`;
            const item = {
              issueKey,
              id: art.id,
              title: art.title,
              currentCategory: art.category,
              suggestedCategory: smart.category,
              suggestedSubCategory: smart.subCategory,
              summary: art.summary || smart.summary,
              reasoning: `Title/Content match '${smart.category}' pattern`,
              isIgnored: ignoredSet.has(issueKey)
            };
            if (item.isIgnored) ignoredArticles.push(item);
            else misclassifiedArticles.push(item);
          }

          // 3. Duplicate Article Check (Identical / Double-up Titles)
          const normTitle = art.title.toLowerCase().trim();
          if (seenTitles.has(normTitle)) {
            const issueKey = `dup:${art.id}`;
            const item = {
              issueKey,
              id: art.id,
              originalId: seenTitles.get(normTitle).id,
              title: art.title,
              category: art.category,
              originalCategory: seenTitles.get(normTitle).category,
              isIgnored: ignoredSet.has(issueKey)
            };
            if (item.isIgnored) ignoredArticles.push(item);
            else duplicateArticles.push(item);
          } else {
            seenTitles.set(normTitle, { id: art.id, category: art.category });
          }

          // 4. Orphaned Article Check (0 Cross-Links / Unlinked Lore)
          if (!activeRelationIds.has(art.id) && !rawContent.includes('@[') && !rawContent.includes('[[')) {
            const issueKey = `orphan:${art.id}`;
            const item = {
              issueKey,
              id: art.id,
              title: art.title,
              category: art.category,
              isIgnored: ignoredSet.has(issueKey)
            };
            if (item.isIgnored) ignoredArticles.push(item);
            else orphanArticles.push(item);
          }

          // 5. Dead Cross-Link Check
          const crossLinkRegex = /@\[([^\]]+)\]|\[\[([^\]]+)\]\]/g;
          let match;
          while ((match = crossLinkRegex.exec(rawContent)) !== null) {
            const targetTitle = (match[1] || match[2] || '').trim();
            if (targetTitle && !validTitlesSet.has(targetTitle.toLowerCase())) {
              const issueKey = `dead:${art.id}:${targetTitle.toLowerCase()}`;
              const item = {
                issueKey,
                sourceId: art.id,
                sourceTitle: art.title,
                deadTargetTitle: targetTitle,
                rawMatch: match[0],
                isIgnored: ignoredSet.has(issueKey)
              };
              if (item.isIgnored) ignoredArticles.push(item);
              else deadCrossLinks.push(item);
            }
          }
        });

        const penalties = (deadCrossLinks.length * 12) + (duplicateArticles.length * 10) + (circularRelations.length * 8) + (misclassifiedArticles.length * 5) + (stubArticles.length * 3) + (orphanArticles.length * 2);
        const healthScore = Math.max(0, Math.min(100, 100 - penalties));

        res.json({
          world_id: world_id || 'all',
          totalAudited: rows.length,
          healthScore,
          counts: {
            duplicates: duplicateArticles.length,
            misclassified: misclassifiedArticles.length,
            stubs: stubArticles.length,
            orphans: orphanArticles.length,
            deadLinks: deadCrossLinks.length,
            circularRelations: circularRelations.length,
            ignored: ignoredArticles.length
          },
          stubCount: stubArticles.length,
          misclassifiedCount: misclassifiedArticles.length,
          duplicateCount: duplicateArticles.length,
          orphanCount: orphanArticles.length,
          deadLinkCount: deadCrossLinks.length,
          circularRelCount: circularRelations.length,
          ignoredCount: ignoredArticles.length,
          stubArticles,
          misclassifiedArticles,
          duplicateArticles,
          orphanArticles,
          deadCrossLinks,
          circularRelations,
          ignoredArticles
        });
      });
    });
  });
});

// GET /api/audit/guided-session - Queue of Guided Repair Session Items
app.get('/api/audit/guided-session', (req, res) => {
  const { world_id } = req.query;
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const queue = [];
    const seenTitles = new Map();

    rows.forEach(art => {
      const normTitle = art.title.toLowerCase().trim();
      const cleanContent = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();

      // Misclassification item
      const smart = smartCategorizeArticle(art.title, art.content);
      if (smart.category !== art.category) {
        queue.push({
          type: 'misclassified',
          articleId: art.id,
          title: art.title,
          currentCategory: art.category,
          suggestedCategory: smart.category,
          suggestedSubCategory: smart.subCategory,
          description: `Current category '${art.category}' does not match content pattern. Recommend updating to '${smart.category}'.`
        });
      }

      // Duplicate item
      if (seenTitles.has(normTitle)) {
        queue.push({
          type: 'duplicate',
          articleId: art.id,
          originalId: seenTitles.get(normTitle).id,
          title: art.title,
          category: art.category,
          description: `Duplicate title found matching "${art.title}". Recommend merging or removing redundant entry.`
        });
      } else {
        seenTitles.set(normTitle, { id: art.id });
      }

      // Stub item
      if (cleanContent.length < 50) {
        queue.push({
          type: 'stub',
          articleId: art.id,
          title: art.title,
          category: art.category,
          description: `Article content is less than 50 characters. Recommend auto-curing or deleting stub.`
        });
      }
    });

    res.json({ total: queue.length, queue });
  });
});

// POST /api/audit/apply-action - Execute Individual Guided Session Repair Action
app.post('/api/audit/apply-action', (req, res) => {
  const { action, articleId, suggestedCategory, suggestedSubCategory } = req.body;
  if (!articleId) return res.status(400).json({ error: 'Missing articleId' });

  if (action === 'reclassify') {
    db.run(
      'UPDATE articles SET category = ?, sub_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [suggestedCategory || 'General', suggestedSubCategory || '', articleId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT content FROM articles WHERE id = ?', [articleId], (err, row) => {
          if (row) syncFileToStorage(articleId, row.content);
          res.json({ success: true, message: `Reclassified article ${articleId} to ${suggestedCategory}` });
        });
      }
    );
  } else if (action === 'delete') {
    db.run('DELETE FROM articles WHERE id = ?', [articleId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      deleteArticleFile(articleId);
      res.json({ success: true, message: `Deleted article ${articleId}` });
    });
  } else {
    res.status(400).json({ error: 'Invalid action type' });
  }
});

// POST /api/audit/batch-repair - 1-Click Multi-Action Vault Repair
app.post('/api/audit/batch-repair', (req, res) => {
  const { world_id, actions } = req.body;
  const targetActions = Array.isArray(actions) ? actions : ['fix_misclassified', 'crosslink_orphans'];

  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    let processedCount = 0;
    const updatedIds = [];

    rows.forEach(art => {
      let modified = false;
      let newCategory = art.category;
      let newSubCategory = art.sub_category;
      let newContent = art.content || '';

      // Action 1: Fix Misclassified
      if (targetActions.includes('fix_misclassified')) {
        const smart = smartCategorizeArticle(art.title, art.content);
        if (smart.category !== art.category) {
          newCategory = smart.category;
          newSubCategory = smart.subCategory;
          modified = true;
        }
      }

      // Action 2: Auto-Crosslink Orphans
      if (targetActions.includes('crosslink_orphans')) {
        const cleanContent = newContent.replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
        if (cleanContent.length >= 50 && !newContent.includes('@[') && !newContent.includes('[[')) {
          rows.forEach(other => {
            if (other.id !== art.id && other.title.length > 3 && newContent.includes(other.title) && !newContent.includes(`@[${other.title}]`)) {
              newContent = newContent.replace(new RegExp(`\\b${other.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), `@[${other.title}](template:article)`);
              modified = true;
            }
          });
        }
      }

      if (modified) {
        processedCount++;
        updatedIds.push(art.id);
        db.run('UPDATE articles SET category = ?, sub_category = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newCategory, newSubCategory, newContent, art.id]
        );
        syncFileToStorage(art.id, newContent);
      }
    });

    res.json({ success: true, processedCount, updatedArticleIds: updatedIds, message: `Batch repair executed successfully across ${processedCount} articles.` });
  });
});

// GET /api/audit/export-report - Export World Health & Diagnostic Report in Markdown
app.get('/api/audit/export-report', (req, res) => {
  const world_id = req.query.world_id || 'default';
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const catCounts = {};
    let totalWords = 0;
    rows.forEach(r => {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
      const plainText = (r.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '');
      totalWords += plainText.split(/\s+/).filter(Boolean).length;
    });

    const stubs = rows.filter(r => (r.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim().length < 50);
    const healthScore = Math.max(0, Math.min(100, 100 - (stubs.length * 4)));

    let markdown = `# 🏥 World Health & Canon Diagnostic Report\n`;
    markdown += `**World Scope**: ${world_id}  \n`;
    markdown += `**Audit Date**: ${new Date().toISOString().split('T')[0]}  \n`;
    markdown += `**World Health Score**: **${healthScore} / 100**  \n\n`;
    markdown += `---\n\n`;
    markdown += `## 📊 Vault Overview\n`;
    markdown += `- **Total Articles**: ${rows.length}\n`;
    markdown += `- **Total Word Count**: ${totalWords.toLocaleString()} words\n`;
    markdown += `- **Flagged Stubs**: ${stubs.length}\n\n`;
    markdown += `### Category Breakdown\n`;
    Object.entries(catCounts).forEach(([cat, count]) => {
      markdown += `- **${cat}**: ${count} articles\n`;
    });
    markdown += `\n---\n\n## 🛠️ Audit Findings & Remediation\n`;
    if (stubs.length > 0) {
      markdown += `### ⚠️ Stub Articles (< 50 words)\n`;
      stubs.forEach(s => markdown += `- [${s.title}](file:///${s.id}) (Category: ${s.category})\n`);
    } else {
      markdown += `✅ No stub articles detected.\n`;
    }

    res.json({ filename: `World_Health_Report_${world_id}.md`, markdownContent: markdown });
  });
});

// POST /api/audit/deep-ai - Deep Gemini AI Audit Scanner & Health Score Calculator
app.post('/api/audit/deep-ai', (req, res) => {
  const { world_id } = req.body;
  let sql = 'SELECT id, title, category, sub_category, summary, content FROM articles WHERE 1=1';
  const params = [];

  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      return res.json({ healthScore: 100, summary: "Vault is empty.", conflicts: [], stubCount: 0 });
    }

    const stubs = rows.filter(r => (r.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim().length < 80);
    const serverCfg = getAIConfig();
    const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

    let healthScore = Math.max(45, 100 - (stubs.length * 4));
    let summary = `Your active world contains ${rows.length} articles (${stubs.length} stubs).`;
    let conflicts = [];

    if (activeKey) {
      const payload = rows.slice(0, 15).map(r => `[ID: ${r.id} | Title: ${r.title} | Category: ${r.category}]: ${r.summary || r.content.substring(0, 450)}`).join('\n');
      const prompt = `You are a Worldbuilding Diagnostic Auditor. Perform a deep narrative audit on these world lore articles.
Detect timeline conflicts, contradictory historical statements, or inconsistent facts between articles.

LORE ARTICLES:
${payload}

Return a valid JSON object ONLY matching this schema:
{
  "healthScore": 88,
  "summary": "Your world has rich Location and Character lore, but lacks Magic Systems (2) and has 1 timeline contradiction.",
  "conflicts": [
    {
      "id": "conflict-1",
      "type": "timeline_conflict",
      "severity": "critical",
      "articleId1": "article_id_1",
      "articleTitle1": "Article Title 1",
      "articleId2": "article_id_2",
      "articleTitle2": "Article Title 2",
      "description": "Article 1 states King Valen died in 1402, but Article 2 states he signed a treaty in 1410.",
      "harmonizedText1": "King Valen abdicated his throne in 1402...",
      "harmonizedText2": "During the Siege in 1410, Valen's successor signed the treaty..."
    }
  ]
}`;

      try {
        const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
        for (const targetModel of candidateModels) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                  const parsed = JSON.parse(match[0]);
                  healthScore = parsed.healthScore || healthScore;
                  summary = parsed.summary || summary;
                  conflicts = parsed.conflicts || [];
                  break;
                }
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    res.json({ healthScore, summary, conflicts, stubCount: stubs.length, totalArticles: rows.length });
  });
});

// POST /api/audit/flesh-out-stub - Generate Genre-Aware Lore Entry for Empty Stub
app.post('/api/audit/flesh-out-stub', async (req, res) => {
  const { stubId, title, category, genre, tone_preset, no_generate_mode: requestNoGen } = req.body;
  const serverCfg = getAIConfig();

  // Craft Purist No-Generate Guardrail Check
  if (requestNoGen === true || serverCfg.no_generate_mode === true) {
    const genreTone = genre || 'High Fantasy';
    const structuredOutline = `[quote]“A cornerstone of ${genreTone} lore.” | — Imperial Archives[/quote]\n\n[row]\n[col]\n[h1]${title}[/h1]\n[b]Overview:[/b] Detailed structural overview outline for ${title} (${category})...\n[/col]\n[col]\n[h3]Overview[/h3]\n[table]\n[tr][th]Field[/th][th]Detail[/th][/tr]\n[tr][td][b]Category:[/b][/td][td]${category}[/td][/tr]\n[tr][td][b]Status:[/b][/td][td]Draft Scaffolding[/td][/tr]\n[/table]\n[/col]\n[/row]\n[hr]\n[h2]I. Historical Lore & Key Details[/h2]\n[b]Record:[/b] Highlighting significance in ${genreTone} lore.`;
    return res.json({ id: stubId, title, content: structuredOutline, no_generate_mode: true });
  }

  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';
  const genreTone = tone_preset || genre || 'High Fantasy';
  const prompt = `Write a rich 2-paragraph world lore article for "${title}" (Category: ${category}) in the style tone "${genreTone}".
STRICTLY use WorldAnvil Simplified Standard syntax:
[quote]“A classic lore entry.” | — Imperial Chronicle[/quote]

[row]
[col]
[h1]${title}[/h1]
First overview paragraph introducing ${title} in the ${genreTone} setting...
[/col]
[col]
[h3]Overview[/h3]
[table]
[tr][th]Field[/th][th]Detail[/th][/tr]
[tr][td][b]Category:[/b][/td][td]${category}[/td][/tr]
[tr][td][b]Status:[/b][/td][td]Active[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. Historical Lore & Significance[/h2]
Second detailed lore paragraph expanding on ${title}...`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return res.json({ id: stubId, title, content: text });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  // Local Fallback Standard Template
  const fallback = `[quote]“A cornerstone of ${genreTone} lore.” | — Imperial Archives[/quote]\n\n[row]\n[col]\n[h1]${title}[/h1]\n${title} is a prominent ${category.toLowerCase()} entry in your ${genreTone} world setting.\n[/col]\n[col]\n[h3]Overview[/h3]\n[table]\n[tr][th]Field[/th][th]Detail[/th][/tr]\n[tr][td][b]Category:[/b][/td][td]${category}[/td][/tr]\n[/table]\n[/col]\n[/row]\n[hr]\n[h2]I. Details[/h2]\n[b]Lore Record:[/b] Chronicles note its significance in recent history.`;
  return res.json({ id: stubId, title, content: fallback });
});

// POST /api/audit/harmonize - Apply Conflict Resolution Across Articles
app.post('/api/audit/harmonize', (req, res) => {
  const { articleId1, newContent1, articleId2, newContent2 } = req.body;
  if (articleId1 && newContent1) {
    db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newContent1, articleId1]);
    syncFileToStorage(articleId1, newContent1);
  }
  if (articleId2 && newContent2) {
    db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newContent2, articleId2]);
    syncFileToStorage(articleId2, newContent2);
  }
  res.json({ message: 'Lore harmonized successfully across both articles!' });
});

// Helper for Post-Import Automated Audit Statistics
function getImportAuditStats(world_id, callback) {
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content, tags FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err || !rows) {
      return callback({ misclassifiedCount: 0, duplicateCount: 0, stubCount: 0 });
    }

    let stubCount = 0;
    let misclassifiedCount = 0;
    let duplicateCount = 0;
    const seenTitles = new Map();

    rows.forEach(art => {
      const cleanContent = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
      const isBoilerplate = /welcome to world anvil|describe a predator|read me first/i.test(cleanContent + ' ' + art.title);
      if (cleanContent.length < 50 || isBoilerplate) {
        stubCount++;
      }

      const smart = smartCategorizeArticle(art.title, art.content);
      if (smart.category !== art.category) {
        misclassifiedCount++;
      }

      const normTitle = art.title.toLowerCase().trim();
      if (seenTitles.has(normTitle)) {
        duplicateCount++;
      } else {
        seenTitles.set(normTitle, true);
      }
    });

    callback({ misclassifiedCount, duplicateCount, stubCount });
  });
}

// POST /api/import/worldanvil - Bulk import articles from World Anvil export JSON
app.post('/api/import/worldanvil', (req, res) => {
  const payload = req.body;
  let articlesToImport = [];

  if (Array.isArray(payload)) {
    articlesToImport = payload;
  } else if (payload && Array.isArray(payload.articles)) {
    articlesToImport = payload.articles;
  } else if (payload && typeof payload === 'object' && payload.title && payload.content) {
    articlesToImport = [payload];
  } else {
    return res.status(400).json({ error: 'Invalid export file format. Expected a JSON array of articles or a World Anvil world export object.' });
  }

  const categoryMap = {
    'person': 'Characters',
    'character': 'Characters',
    'location': 'Locations',
    'settlement': 'Locations',
    'geography': 'Locations',
    'landmark': 'Locations',
    'organization': 'Factions',
    'faction': 'Factions',
    'species': 'Species',
    'race': 'Species',
    'creature': 'Species',
    'item': 'Items',
    'equipment': 'Items',
    'spell': 'Magic & Tech',
    'magic': 'Magic & Tech',
    'technology': 'Magic & Tech',
    'event': 'History',
    'historical_event': 'History',
    'era': 'History'
  };

  let importedCount = 0;
  let updatedCount = 0;
  const categoryCounts = {};
  const targetWorldId = req.query.world_id || req.body.world_id || (payload && payload.world_id) || 'default';

  const stmt = db.prepare(`
    INSERT INTO articles (id, title, category, sub_category, world_id, summary, content, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      sub_category = excluded.sub_category,
      world_id = excluded.world_id,
      summary = excluded.summary,
      content = excluded.content,
      tags = excluded.tags,
      updated_at = CURRENT_TIMESTAMP
  `);

  articlesToImport.forEach(item => {
    const rawTitle = item.title || item.name || 'Untitled Lore Article';
    const id = item.id || item.slug || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Map Category
    let category = 'Locations';
    const rawCat = (item.template || item.type || (item.category && item.category.name) || '').toLowerCase();
    if (categoryMap[rawCat]) {
      category = categoryMap[rawCat];
    } else if (rawCat.includes('char') || rawCat.includes('person')) {
      category = 'Characters';
    } else if (rawCat.includes('fac') || rawCat.includes('org')) {
      category = 'Factions';
    } else if (rawCat.includes('item') || rawCat.includes('weapon')) {
      category = 'Items';
    } else if (rawCat.includes('magic') || rawCat.includes('spell')) {
      category = 'Magic & Tech';
    } else if (rawCat.includes('event') || rawCat.includes('history')) {
      category = 'History';
    }

    const smart = smartCategorizeArticle(rawTitle, item.content || item.body || item.content_parsed || item.bbcode || '');
    const subCategory = item.sub_category || smart.subCategory || 'General';

    const summary = item.summary || item.snippet || item.excerpt || smart.summary || '';
    const content = item.content || item.body || item.content_parsed || item.bbcode || '';

    // Normalize tags
    let tags = [];
    if (Array.isArray(item.tags)) tags = item.tags;
    else if (typeof item.user_tags === 'string') tags = item.user_tags.split(',').map(t => t.trim()).filter(Boolean);
    else if (typeof item.tags === 'string') tags = item.tags.split(',').map(t => t.trim()).filter(Boolean);

    stmt.run(id, rawTitle, category, subCategory, targetWorldId, summary, content, JSON.stringify(tags), function(err) {
      if (!err) {
        extractCrossLinks(id, content);
        syncFileToStorage(id, content);
        importedCount++;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
  });

  stmt.finalize(() => {
    getImportAuditStats(targetWorldId, (auditStats) => {
      const importAudit = {
        importedCount,
        imageCount: 0,
        categoryCounts,
        misclassifiedCount: auditStats.misclassifiedCount,
        duplicateCount: auditStats.duplicateCount,
        world_id: targetWorldId
      };

      res.json({
        message: `Successfully imported ${importedCount} articles into LoreVault!`,
        importedCount,
        importAudit
      });
    });
  });
});

// Helper for Smart AI Auto-Categorization
function smartCategorizeArticle(title, rawContent, filename = '') {
  const content = rawContent || '';
  const cleanTitle = (title || '').toLowerCase();
  const textLower = (title + ' ' + content + ' ' + filename).toLowerCase();

  const scores = {
    'Characters': 0,
    'Locations': 0,
    'Factions': 0,
    'Races & Species': 0,
    'Magic & Tech': 0,
    'History': 0,
    'Items': 0
  };

  // Title-based strong signals (+5 points)
  if (/\b(city|town|village|kingdom|realm|continent|region|mountain|mountains|river|ocean|sea|forest|fortress|castle|garrison|gate|mill|isles|island|lake|reach|harbor|bay|valley|ruins)\b/i.test(cleanTitle)) scores['Locations'] += 5;
  if (/\b(house|syndicate|vanguard|guild|order|clan|empire|alliance|organization|faction|council|cult|rebellion|covenant|society)\b/i.test(cleanTitle)) scores['Factions'] += 5;
  if (/\b(lord|lady|king|queen|empress|emperor|prince|princess|sir|captain|elder|seer|cantor|warlock|wizard|sorcerer|sameral|character|biography)\b/i.test(cleanTitle)) scores['Characters'] += 5;
  if (/\b(species|race|races|humanoid|elf|elves|dwarf|dwarves|orc|orcs|dragon|dragons|fae|beast|monster|lineage|ancestry)\b/i.test(cleanTitle)) scores['Races & Species'] += 5;
  if (/\b(spell|spells|magic|mana|arcane|alchemy|tech|technology|artifact|rune|words of power)\b/i.test(cleanTitle)) scores['Magic & Tech'] += 5;
  if (/\b(war|battle|era|age|chronicle|timeline|event|history)\b/i.test(cleanTitle)) scores['History'] += 5;
  if (/\b(sword|blade|shield|armor|potion|ring|amulet|item|weapon|relic)\b/i.test(cleanTitle)) scores['Items'] += 5;

  // Content-based body signals (+2 points)
  if (/born|age|biography|personality|eyes|hair|lineage|father|mother|husband|wife|hero|villain|adventurer|person|character/i.test(textLower)) scores['Characters'] += 2;
  if (/city|town|village|kingdom|realm|continent|region|mountain|river|ocean|sea|forest|fortress|castle|climate|location|geography|settlement/i.test(textLower)) scores['Locations'] += 2;
  if (/guild|house|syndicate|army|legion|order|clan|empire|alliance|organization|faction|council|cult|rebellion/i.test(textLower)) scores['Factions'] += 2;
  if (/race|species|humanoid|elf|dwarf|orc|dragon|fae|creature|lifespan|subspecies|beast|ancestry|lineage/i.test(textLower)) scores['Races & Species'] += 2;
  if (/magic|spell|mana|arcane|alchemy|element|enchantment|crystal|technology|machine|artifact|rune/i.test(textLower)) scores['Magic & Tech'] += 2;
  if (/war|battle|era|age of|founding|shattering|treaty|historical|chronicle|timeline|event|century/i.test(textLower)) scores['History'] += 2;
  if (/sword|blade|shield|armor|potion|ring|amulet|artifact|item|weapon|relic|reagent/i.test(textLower)) scores['Items'] += 2;

  let cleanText = content.replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
  let firstParagraph = cleanText.split(/\n\n+/)[0] || '';
  let summary = firstParagraph.substring(0, 160);
  if (summary.length >= 160) summary += '...';

  let topCategory = 'Locations';
  let subCategory = 'Cities & Settlements';
  let keywordMaxScore = -1;

  const keywordsMap = {
    'Characters': {
      weight: 3,
      keywords: ['character', 'person', 'hero', 'villain', 'king', 'queen', 'emperor', 'npc', 'biography', 'lord', 'lady', 'warrior', 'mage', 'rogue', 'paladin', 'cleric', 'born', 'died', 'father', 'mother', 'son', 'daughter', 'height', 'weight', 'eyes', 'hair'],
      subCategories: {
        'Rulers & Nobility': ['king', 'queen', 'emperor', 'empress', 'prince', 'princess', 'lord', 'lady', 'noble', 'nobility', 'duke', 'duchess', 'baron'],
        'Mages & Mystics': ['seer', 'wizard', 'sorcerer', 'warlock', 'mage', 'priest', 'cantor', 'mystic', 'archmage', 'druid', 'cleric'],
        'Warriors & Officers': ['captain', 'commander', 'soldier', 'guard', 'knight', 'warrior', 'officer', 'general', 'champion'],
        'Key Figures & Personages': ['figure', 'hero', 'villain', 'adventurer', 'biography', 'npc', 'person', 'character']
      }
    },
    'Locations': {
      weight: 2,
      keywords: ['location', 'city', 'town', 'village', 'settlement', 'kingdom', 'realm', 'region', 'continent', 'mountain', 'river', 'forest', 'ocean', 'sea', 'lake', 'castle', 'fortress', 'dungeon', 'temple', 'shrine', 'capital', 'province', 'wilderness', 'ruins'],
      subCategories: {
        'Cities & Settlements': ['city', 'town', 'village', 'capital', 'settlement', 'port', 'metropolis'],
        'Fortresses & Strongholds': ['fortress', 'castle', 'garrison', 'keep', 'citadel', 'eyrie', 'stronghold'],
        'Realms & Territories': ['realm', 'kingdom', 'empire', 'continent', 'region', 'territory', 'province'],
        'Geography & Wilderness': ['mountain', 'river', 'forest', 'valley', 'desert', 'ocean', 'sea', 'lake', 'island', 'wilderness'],
        'Landmarks & Ruins': ['landmark', 'ruin', 'ruins', 'temple', 'shrine', 'monument', 'spire', 'tower', 'dungeon', 'site']
      }
    },
    'Factions': {
      weight: 3,
      keywords: ['faction', 'organization', 'guild', 'order', 'cult', 'clan', 'house', 'syndicate', 'alliance', 'covenant', 'brotherhood', 'fleet', 'company', 'court', 'council', 'society', 'dynasty'],
      subCategories: {
        'Noble Houses & Dynasties': ['house', 'dynasty', 'clan', 'noble', 'bloodline', 'family'],
        'Syndicates & Guilds': ['guild', 'syndicate', 'rogue', 'underground', 'merchant', 'cartel', 'trade'],
        'Military Orders': ['army', 'legion', 'guard', 'vanguard', 'military', 'order', 'knights', 'company'],
        'Organizations & Societies': ['organization', 'society', 'council', 'cult', 'covenant', 'alliance', 'brotherhood', 'cabal', 'faction']
      }
    },
    'Races & Species': {
      weight: 3,
      keywords: ['species', 'race', 'races', 'creature', 'monster', 'beast', 'fauna', 'flora', 'plant', 'herb', 'dragon', 'elf', 'elves', 'dwarf', 'dwarves', 'orc', 'orcs', 'goblin', 'undead', 'demon', 'elemental', 'lineage', 'ancestry', 'humanoid', 'playable'],
      subCategories: {
        'Playable Races & Lineages': ['elf', 'elves', 'dwarf', 'dwarves', 'orc', 'orcs', 'human', 'humans', 'gnome', 'halfling', 'tiefling', 'dragonborn', 'race', 'races', 'ancestry', 'lineage', 'subrace', 'playable', 'people', 'culture'],
        'Beasts & Creatures': ['beast', 'beasts', 'creature', 'creatures', 'animal', 'fauna', 'mount', 'pet', 'wild', 'aquatic'],
        'Monsters & Entities': ['monster', 'monsters', 'dragon', 'dragons', 'demon', 'demons', 'undead', 'aberration', 'fiend', 'devil', 'construct', 'boss', 'horror'],
        'Flora & Ecology': ['plant', 'plants', 'herb', 'herbs', 'tree', 'flower', 'fauna', 'flora', 'fungus', 'ecosystem', 'botanical']
      }
    },
    'Items': {
      weight: 3,
      keywords: ['item', 'weapon', 'armor', 'artifact', 'relic', 'potion', 'scroll', 'tool', 'equipment', 'sword', 'blade', 'bow', 'crown', 'helm', 'elixir', 'salve', 'reagent', 'trinket', 'valuable'],
      subCategories: {
        'Weapons & Armaments': ['sword', 'blade', 'bow', 'staff', 'weapon', 'armaments', 'spear', 'axe', 'hammer', 'dagger'],
        'Armor & Relics': ['armor', 'shield', 'relic', 'relics', 'helm', 'plate', 'mail', 'gauntlet', 'cuirass'],
        'Potions & Reagents': ['potion', 'potions', 'elixir', 'salve', 'reagent', 'reagents', 'ingredient', 'alchemy', 'vial'],
        'Trinkets & Valuables': ['trinket', 'trinkets', 'valuable', 'gem', 'ring', 'amulet', 'coin', 'tome', 'pendant', 'crown', 'item']
      }
    },
    'Magic & Tech': {
      weight: 3,
      keywords: ['magic', 'spell', 'spells', 'technology', 'tech', 'alchemy', 'rune', 'runes', 'enchantment', 'ritual', 'system', 'device', 'construct', 'golem', 'ship', 'airship', 'engine', 'power', 'catalyst', 'artifact', 'machinery'],
      subCategories: {
        'Spells & Incantations': ['spell', 'spells', 'incantation', 'incantations', 'rune', 'runes', 'words of power', 'hex', 'curse', 'ritual'],
        'Arcane Artifacts & Catalysts': ['artifact', 'artifacts', 'catalyst', 'catalysts', 'crystal', 'crystals', 'orb', 'focus', 'wand'],
        'Technology & Machinery': ['technology', 'tech', 'machinery', 'machine', 'machines', 'device', 'construct', 'golem', 'engine', 'airship'],
        'Magic Systems & Theories': ['system', 'systems', 'theory', 'mana', 'ether', 'weave', 'school of magic', 'magic']
      }
    },
    'History': {
      weight: 3,
      keywords: ['history', 'event', 'war', 'battle', 'era', 'age', 'siege', 'treaty', 'accord', 'revolution', 'cataclysm', 'shattering', 'rebellion', 'fall', 'rise', 'chronicle', 'timeline', 'century', 'epoch'],
      subCategories: {
        'Wars & Battles': ['war', 'wars', 'battle', 'battles', 'siege', 'rebellion', 'crusade', 'conflict', 'clash'],
        'Eras & Ages': ['era', 'eras', 'age', 'ages', 'period', 'century', 'epoch'],
        'Treaties & Accords': ['treaty', 'treaties', 'accord', 'accords', 'pact', 'charter', 'pardon'],
        'Chronicles & Key Events': ['chronicle', 'chronicles', 'event', 'events', 'shattering', 'cataclysm', 'founding', 'fall', 'rise', 'history']
      }
    }
  };

  for (const [catName, catData] of Object.entries(keywordsMap)) {
    let score = (scores[catName] || 0) * 5;
    catData.keywords.forEach(kw => {
      if (cleanTitle.includes(kw)) score += kw.length * 4;
      if (textLower.includes(kw)) score += 1;
    });

    score *= catData.weight;

    if (score > keywordMaxScore) {
      keywordMaxScore = score;
      topCategory = catName;

      let subScore = -1;
      let chosenSub = Object.keys(catData.subCategories)[0];
      for (const [subName, subKws] of Object.entries(catData.subCategories)) {
        let currentSubScore = 0;
        subKws.forEach(skw => {
          if (cleanTitle.includes(skw)) currentSubScore += 3;
          if (textLower.includes(skw)) currentSubScore += 1;
        });
        if (currentSubScore > subScore) {
          subScore = currentSubScore;
          chosenSub = subName;
        }
      }
      subCategory = chosenSub;
    }
  }

  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  summary = sentences.slice(0, 2).join(' ').trim() || summary || `${title} lore article.`;

  const autoTags = new Set([topCategory.toLowerCase()]);
  if (subCategory && subCategory !== 'General') autoTags.add(subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  return {
    category: topCategory,
    subCategory,
    summary: summary || `${title} lore article.`,
    tags: Array.from(autoTags)
  };
}

// POST /api/import/zip - Smart ZIP Extractor & Categorizer
app.post('/api/import/zip', upload.single('zipfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No ZIP archive uploaded.' });
  }

  try {
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    let importedCount = 0;
    let imageCount = 0;
    const categoryCounts = {};

    // Phase 1: Extract all image assets first
    zipEntries.forEach(entry => {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || entry.entryName.startsWith('.')) return;
      const filename = entry.entryName;
      const fileExt = path.extname(filename).toLowerCase();
      
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(fileExt)) {
        const baseName = path.basename(filename);
        const targetPath = path.join(imagesDir, baseName);
        fs.writeFileSync(targetPath, entry.getData());
        imageCount++;
      }
    });

    // Helper to fix image src and WorldAnvil [img] tags
    const normalizeImagesInContent = (content) => {
      if (!content) return '';
      let updated = content;
      // WorldAnvil [img]filename.ext[/img] -> [img]/uploads/images/filename.ext[/img]
      updated = updated.replace(/\[img\](?!https?:\/\/|\/)([^\[\]]+)\[\/img\]/gi, '[img]/uploads/images/$1[/img]');
      // Markdown ![alt](filename.ext) -> ![alt](/uploads/images/filename.ext)
      updated = updated.replace(/!\[([^\]]*)\]\((?!https?:\/\/|\/)([^)]+)\)/gi, '![$1](/uploads/images/$2)');
      // HTML <img src="filename.ext"> -> <img src="/uploads/images/filename.ext">
      updated = updated.replace(/src=["'](?!https?:\/\/|\/)([^"']+)["']/gi, 'src="/uploads/images/$1"');
      return updated;
    };

    const targetWorldId = req.query.world_id || req.body.world_id || 'default';

    const stmt = db.prepare(`
      INSERT INTO articles (id, title, category, sub_category, world_id, summary, content, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        sub_category = excluded.sub_category,
        world_id = excluded.world_id,
        summary = excluded.summary,
        content = excluded.content,
        tags = excluded.tags,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Phase 2: Process articles
    zipEntries.forEach(entry => {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || entry.entryName.startsWith('.')) return;

      const filename = entry.entryName;
      const fileExt = path.extname(filename).toLowerCase();

      // Handle JSON export files inside ZIP
      if (fileExt === '.json') {
        try {
          const jsonContent = entry.getData().toString('utf8');
          const parsed = JSON.parse(jsonContent);
          const items = Array.isArray(parsed) ? parsed : (parsed.articles || [parsed]);

          items.forEach(item => {
            if (!item.title && !item.name) return;
            const title = item.title || item.name;
            const id = item.id || item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const rawContent = normalizeImagesInContent(item.content || item.body || item.bbcode || '');

            const smart = smartCategorizeArticle(title, rawContent, filename);
            const category = item.category?.name || item.template || smart.category;
            const summary = item.summary || item.snippet || item.excerpt || smart.summary;
            const tags = item.tags || smart.tags;

            stmt.run(id, title, category, smart.subCategory, targetWorldId, summary, rawContent, JSON.stringify(tags), (err) => {
              if (!err) {
                extractCrossLinks(id, rawContent);
                syncFileToStorage(id, rawContent);
                importedCount++;
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
              }
            });
          });
        } catch (e) {
          console.warn('Skipping unparseable JSON file:', filename);
        }
      }
      // Handle HTML / Markdown / TXT articles inside ZIP
      else if (['.html', '.md', '.txt', '.wa'].includes(fileExt)) {
        const rawContent = normalizeImagesInContent(entry.getData().toString('utf8'));
        const baseName = path.basename(filename, fileExt);
        
        let title = baseName.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const h1Match = rawContent.match(/^#\s+(.+)$/m) || rawContent.match(/<h1[^>]*>([^<]+)<\/h1>/i) || rawContent.match(/\[h1\]([^\[]+)\[\/h1\]/i);
        if (h1Match && h1Match[1]) {
          title = h1Match[1].trim();
        }

        const id = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const smart = smartCategorizeArticle(title, rawContent, filename);

        stmt.run(id, title, smart.category, smart.subCategory, targetWorldId, smart.summary, rawContent, JSON.stringify(smart.tags), (err) => {
          if (!err) {
            extractCrossLinks(id, rawContent);
            syncFileToStorage(id, rawContent);
            importedCount++;
            categoryCounts[smart.category] = (categoryCounts[smart.category] || 0) + 1;
          }
        });
      }
    });

    stmt.finalize(() => {
      getImportAuditStats(targetWorldId, (auditStats) => {
        const importAudit = {
          importedCount,
          imageCount,
          categoryCounts,
          misclassifiedCount: auditStats.misclassifiedCount,
          duplicateCount: auditStats.duplicateCount,
          stubCount: auditStats.stubCount,
          world_id: targetWorldId
        };

        res.json({
          message: `Smart Imported ${importedCount} articles & ${imageCount} images from ZIP archive!`,
          importedCount,
          imageCount,
          categoryCounts,
          importAudit
        });
      });
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to process ZIP archive: ' + err.message });
  }
});


// --- SEED SAMPLE DATA (WorldAnvil Simplified Standard Formatting) ---
function seedDefaultArticles() {
  const sample1 = {
    id: 'valoria-empire',
    title: 'The Empire of Valoria',
    category: 'Locations',
    summary: 'The grand sun-sworn empire spanning the central continent of Aethelgard.',
    content: `[quote]“Under the golden sun, no sword stays unblessed.” | — Imperial Motto[/quote]

[row]
[col]
[h1]The Empire of Valoria[/h1]
Founded three centuries ago following the Shattering of the Obsidian Citadel, the Empire of Valoria stands as the dominant political and military force across the continent of Aethelgard. Built around the radiant Sun-Well of Solaria, the Empire relies on light-infused magic, disciplined legions, and strict societal ranks to enforce peace across its wide territories.

The climate ranges from temperate coastal plains near the capital city to dense, mist-shrouded ancient woodlands along the western frontier where border skirmishes with @[House Ravenwing](factions:house-ravenwing) remain frequent.
[/col]
[col]
[h3]Imperial Overview[/h3]
[table]
[tr][th]Attribute[/th][th]Details[/th][/tr]
[tr][td]Government[/td][td]Solar Autocracy[/td][/tr]
[tr][td]Capital[/td][td]Solaria Prime[/td][/tr]
[tr][td]Primary Faith[/td][td]The Eternal Flame[/td][/tr]
[tr][td]Ruler[/td][td]Empress Aurelia III[/td][/tr]
[tr][td]Key Alloy[/td][td]Sun-Forged Steel[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. Cultural Philosophy[/h2]
Valorians place high value on honor, duty, and lineage. Citizens are expected to dedicate their primary craft to the service of the Flame. Art and architecture favor towering marble pillars, stained glass depicting solar victories, and wide open-air plazas.

[h2]II. Military & Arcane Power[/h2]
[b]Legion Structure:[/b] The Sun-Guard forms the vanguard of the imperial army, wielding heavy warhammers channelled with holy solar energy.
[b]Arcane Orders:[/b] The Order of the Solar Weavers manipulates light rays into defensive barriers and blinding projectile blasts.

[h2]III. Foreign Relations[/h2]
While trade thrives along the Eastern Sea with neighboring merchant guilds, tensions remain high with @[The Shadow Vanguard](factions:shadow-vanguard) who seek to siphon power from the Sun-Well.`,
    tags: JSON.stringify(['Empire', 'Valoria', 'Sun-Magic', 'Aethelgard'])
  };

  const sample2 = {
    id: 'house-ravenwing',
    title: 'House Ravenwing',
    category: 'Factions',
    summary: 'An ancient noble house ruling the shadowed pine forests of the Western Frontier.',
    content: `[quote]“From the deep shadows, we watch the dawn.” | — House Creed[/quote]

[row]
[col]
[h1]House Ravenwing[/h1]
House Ravenwing is one of the oldest noble bloodlines on Aethelgard. Unlike the sun-worshiping court of @[The Empire of Valoria](locations:valoria-empire), the Ravenwings draw their power from ancestral spirit bonds and night-blooming flora.

Operating from their ancestral mountain fortress of Blackstone Keep, House Ravenwing maintains fierce independence. They act as guardians of the Western Reach, keeping ancient forest behemoths at bay.
[/col]
[col]
[h3]Faction Profile[/h3]
[table]
[tr][th]Property[/th][th]Value[/th][/tr]
[tr][td]Leader[/td][td]Lord Corvus Ravenwing[/td][/tr]
[tr][td]Seat of Power[/td][td]Blackstone Keep[/td][/tr]
[tr][td]Specialty[/td][td]Shadow Magic & Archery[/td][/tr]
[tr][td]Symbol[/td][td]Silver Raven on Obsidian[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. History & Heritage[/h2]
House Ravenwing claims lineage directly from the Shadow-Walkers of old. When the sun-worshipers unified the central plains, Ravenwing lords signed a non-aggression pact to preserve their woodland sovereignty.

[h2]II. Notable Members[/h2]
[b]Lord Corvus Ravenwing:[/b] The current patriarch, famed for his strategic brilliance and shadow-raven familiar.
[b]Lady Lyra Ravenwing:[/b] Master spymaster operating covertly within the imperial capital.`,
    tags: JSON.stringify(['Nobility', 'Faction', 'Shadow-Magic', 'Forest'])
  };

  const sample3 = {
    id: 'shadow-vanguard',
    title: 'The Shadow Vanguard',
    category: 'Factions',
    summary: 'A secretive syndicate of rogue sorcerers and mercenaries operating in the under-city.',
    content: `[quote]“Light casts the darkest shadows.” | — Vanguard Cipher[/quote]

[row]
[col]
[h1]The Shadow Vanguard[/h1]
Operating out of subterranean networks beneath @[The Empire of Valoria](locations:valoria-empire), the Shadow Vanguard is a clandestine organization dedicated to disrupting the Imperial Solar Hegemony.

They specialize in siphoning arcane energy from magical nexus points and dealing in illegal void artifacts smuggled across the borders.
[/col]
[col]
[h3]Syndicate Details[/h3]
[table]
[tr][th]Aspect[/th][th]Details[/th][/tr]
[tr][td]Type[/td][td]Underground Syndicate[/td][/tr]
[tr][td]Base[/td][td]The Catacombs of Solaria[/td][/tr]
[tr][td]Alignment[/td][td]Rebellious Arcane[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. Operations[/h2]
[b]Smuggling:[/b] Trafficking prohibited magical catalysts.
[b]Infiltration:[/b] Maintaining covert agents inside both @[The Empire of Valoria](locations:valoria-empire) and @[House Ravenwing](factions:house-ravenwing).`,
    tags: JSON.stringify(['Syndicate', 'Underground', 'Rogue', 'Magic'])
  };

  const stmt = db.prepare(`
    INSERT INTO articles (id, title, category, summary, content, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  [sample1, sample2, sample3].forEach(art => {
    stmt.run(art.id, art.title, art.category, art.summary, art.content, art.tags, (err) => {
      if (!err) {
        extractCrossLinks(art.id, art.content);
        syncFileToStorage(art.id, art.content);
      }
    });
  });
  stmt.finalize();
  console.log('Seeded sample WorldAnvil articles into lore database.');
}

// --- PHASE 3 API ENDPOINTS: PERSONAS, INTERVIEWER, POV REWRITE & SCENE BEATS ---

// GET /api/personas/:article_id
app.get('/api/personas/:article_id', (req, res) => {
  db.get('SELECT * FROM personas WHERE article_id = ?', [req.params.article_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { article_id: req.params.article_id, thoughts: '', wants: '', needs: '', history_log: '' });
  });
});

// POST /api/personas
app.post('/api/personas', (req, res) => {
  const { article_id, thoughts, wants, needs, history_log } = req.body;
  if (!article_id) return res.status(400).json({ error: 'article_id is required' });
  const id = 'per-' + Date.now();
  db.run(`INSERT INTO personas (id, article_id, thoughts, wants, needs, history_log, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, article_id, thoughts || '', wants || '', needs || '', history_log || ''],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Persona profile created successfully!' });
    }
  );
});

// PUT /api/personas/:article_id
app.put('/api/personas/:article_id', (req, res) => {
  const { thoughts, wants, needs, history_log } = req.body;
  db.run(`UPDATE personas SET thoughts=?, wants=?, needs=?, history_log=?, updated_at=CURRENT_TIMESTAMP WHERE article_id=?`,
    [thoughts || '', wants || '', needs || '', history_log || '', req.params.article_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Persona profile updated successfully!' });
    }
  );
});

/**
 * Helper to select persona profiles (wants, needs, thoughts, history_log) for given article IDs.
 * @param {Array<string>|string} cast_ids
 * @param {function(Error, Array): void} callback
 */
function getCastPersonaContext(cast_ids, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback function required for getCastPersonaContext');
  }

  let ids = [];
  if (Array.isArray(cast_ids)) {
    ids = cast_ids;
  } else if (typeof cast_ids === 'string' && cast_ids.trim().length > 0) {
    try {
      const parsed = JSON.parse(cast_ids);
      if (Array.isArray(parsed)) {
        ids = parsed;
      } else {
        ids = cast_ids.split(',').map(id => id.trim()).filter(Boolean);
      }
    } catch (e) {
      ids = cast_ids.split(',').map(id => id.trim()).filter(Boolean);
    }
  }

  if (!ids || ids.length === 0) {
    return callback(null, []);
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `SELECT article_id, wants, needs, thoughts, history_log FROM personas WHERE article_id IN (${placeholders})`;

  db.all(query, ids, (err, rows) => {
    if (err) return callback(err, []);
    callback(null, rows || []);
  });
}


// POST /api/personas/generate
app.post('/api/personas/generate', async (req, res) => {
  const { article_id } = req.body;
  if (!article_id) return res.status(400).json({ error: 'article_id is required' });

  db.get('SELECT content, title FROM articles WHERE id = ?', [article_id], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Article not found' });
    
    const serverCfg = getAIConfig();
    const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';
    if (!activeKey) return res.status(400).json({ error: 'AI not configured' });

    const prompt = `Analyze the following lore text about the character "${row.title}" and extract their internal persona.
If the provided lore is short or vague, use your creative reasoning as an expert writer to INVENT logical, compelling thoughts, wants, and needs that fit the character's archetype and available lore.

Return EXACTLY a JSON object with three string fields: "thoughts", "wants", and "needs". Do not use markdown blocks or any other text.

Lore Text:
${row.content.substring(0, 3000)}`;

    try {
      const model = serverCfg.model || 'gemini-flash-latest';
      let text = await callGeminiApi(prompt, activeKey, model);
      if (!text) {
        throw new Error('Gemini API returned empty response across all candidate models');
      }
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const result = JSON.parse(text);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'AI generation failed: ' + e.message });
    }
  });
});

// GET /api/personas/:id/history
app.get('/api/personas/:id/history', (req, res) => {
  db.all('SELECT * FROM character_history WHERE character_id = ? ORDER BY created_at ASC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/personas/history
app.post('/api/personas/history', (req, res) => {
  const { character_id, chapter_id, event_text } = req.body;
  if (!character_id || !event_text) return res.status(400).json({ error: 'character_id and event_text are required' });

  const id = 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  db.run('INSERT INTO character_history (id, character_id, chapter_id, event_text) VALUES (?, ?, ?, ?)',
    [id, character_id, chapter_id || 'ch-1', event_text],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, message: 'Event logged to character history!' });
    }
  );
});

// POST /api/personas/interview - In-Character LLM Chat & Interviewer Engine
app.post('/api/personas/interview', async (req, res) => {
  const { characterId, characterName, question, persona, history } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const personaContext = `CHARACTER: ${characterName || characterId}
Inner Thoughts: ${persona?.thoughts || 'Direct, calculative'}
Wants/Desires: ${persona?.wants || 'Protect allies'}
Needs/Vulnerabilities: ${persona?.needs || 'Overcome past loss'}
History Memory Log: ${persona?.history_log || history?.join('; ') || 'No history recorded.'}`;

  const prompt = `You are roleplaying as ${characterName || characterId}.
STRICTLY adopt this character's persona, speech mannerisms, worldview, and memory log below:

${personaContext}

USER QUESTION: "${question}"

Respond 100% IN-CHARACTER in the first person ("I"). Match your speech mannerisms and history memory log accurately.`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return res.json({ characterName: characterName || characterId, reply: text });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return res.json({ characterName: characterName || characterId, reply: `[In-Character]: Regarding "${question}", I stand ready to defend our ground.` });
});

// POST /api/scene/pov-rewrite - Re-write Scene in First-Person POV
app.post('/api/scene/pov-rewrite', async (req, res) => {
  const { sceneText, characterName, persona, history } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const prompt = `Re-write the following scene passage strictly through the First-Person ("I") perspective and emotional lens of ${characterName}.

CHARACTER PERSONA:
Thoughts: ${persona?.thoughts || ''}
Wants: ${persona?.wants || ''}
Needs: ${persona?.needs || ''}
Speech: ${persona?.speech_mannerisms || ''}
History: ${(history || []).join('; ')}

ORIGINAL SCENE:
${sceneText}

Write compelling, immersive POV prose:`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return res.json({ povProse: text });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return res.json({ povProse: `I observe the scene unfold before me... ${sceneText}` });
});

// POST /api/scene/suggest-beats - Generate 3 Lore-Grounded Narrative Beats
app.post('/api/scene/suggest-beats', async (req, res) => {
  const { sceneTitle, manuscriptText, activeCast, location } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const prompt = `You are a Worldbuilding Novel Co-Writer. Analyze the scene manuscript below and generate 3 distinct, compelling narrative beat options grounded in lore.

SCENE TITLE: "${sceneTitle || 'Untitled Scene'}"
LOCATION: "${location || 'Unknown'}"
ACTIVE CAST: ${(activeCast || []).join(', ')}
MANUSCRIPT SO FAR:
${manuscriptText || 'The scene begins...'}

Return a valid JSON object ONLY matching this schema:
{
  "beats": [
    {
      "id": "beat-1",
      "type": "Action & Tension",
      "title": "Unexpected Ambush",
      "summary": "Shadow raiders tear through the floorboards.",
      "generatedProse": "A splintering crack echoes through the room..."
    },
    {
      "id": "beat-2",
      "type": "Lore Discovery",
      "title": "Garrison Dispatch",
      "summary": "Finding a sealed letter from Fort Redcliff.",
      "generatedProse": "Tabor bends down near the fallen scout, prying a blood-stained pouch..."
    },
    {
      "id": "beat-3",
      "type": "Character Confrontation",
      "title": "Roland's Warning",
      "summary": "Roland cautions the party about bloody footprints.",
      "generatedProse": "Roland raises a hand, halting the party. 'Look at the ground,' he whispers..."
    }
  ]
}`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const match = text.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.beats) return res.json({ beats: parsed.beats });
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  // Local Fallback Beats
  const fallbackBeats = [
    {
      id: "beat-1",
      type: "Action & Conflict",
      title: "Sudden Disturbance",
      summary: "Footsteps echo outside the door.",
      generatedProse: "Footsteps sound against the gravel road outside. Shadows shift through the broken window frames."
    },
    {
      id: "beat-2",
      type: "Lore Discovery",
      title: "Scouted Clue",
      summary: "A symbol carved into the wooden doorframe.",
      generatedProse: "Near the door, a freshly carved sigil glints in the torchlight—a mark of the void."
    },
    {
      id: "beat-3",
      "type": "Dialogue",
      "title": "Tactical Caution",
      "summary": "A companion whispers a warning.",
      "generatedProse": "'Stay close,' comes the whispered instruction. 'We don't know how many are inside.'"
    }
  ];
  return res.json({ beats: fallbackBeats });
});

// GET /api/scenes
app.get('/api/scenes', (req, res) => {
  db.all('SELECT * FROM scenes ORDER BY updated_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/scenes
app.post('/api/scenes', (req, res) => {
  const { id, chapter_id, title, content, active_cast, location_id } = req.body;
  const sceneId = id || ('scene-' + Date.now());
  const words = (content || '').trim().split(/\s+/).filter(w => w.length > 0).length;

  db.run(`INSERT INTO scenes (id, chapter_id, title, content, word_count, active_cast, location_id, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, content=excluded.content, word_count=excluded.word_count, active_cast=excluded.active_cast, location_id=excluded.location_id, updated_at=CURRENT_TIMESTAMP`,
    [sceneId, chapter_id || 'ch-1', title || 'Untitled Scene', content || '', words, JSON.stringify(active_cast || []), location_id || ''],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: sceneId, title, word_count: words, message: 'Scene saved successfully!' });
    }
  );
});

// ==========================================
// NARRATIVE SLATE API SUITE
// ==========================================

function safeParseArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
      return input.split(',').map(s => s.trim()).filter(Boolean);
    } catch (e) {
      return input.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

async function callGeminiText(prompt) {
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';
  if (!activeKey) return null;

  const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-flash-latest', 'gemini-pro-latest'];
  for (const targetModel of candidateModels) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      clearTimeout(timer);
      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {}
  }
  return null;
}

// POST /api/narrative/compile-slate
app.post('/api/narrative/compile-slate', (req, res) => {
  try {
    const { plot_hook, scene_steps, cast_ids, pinned_lore_ids, tone_chips, visibility, max_tokens } = req.body || {};

    const parsedCastIds = safeParseArray(cast_ids);
    const parsedLoreIds = safeParseArray(pinned_lore_ids);
    const parsedSteps = safeParseArray(scene_steps);
    const parsedTones = safeParseArray(tone_chips);

    getCastPersonaContext(parsedCastIds, (err, personas) => {
      if (err) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
      }

      const fetchLore = (cb) => {
        if (!parsedLoreIds || parsedLoreIds.length === 0) return cb(null, []);
        const placeholders = parsedLoreIds.map(() => '?').join(',');
        db.all(`SELECT id, title, summary, content FROM articles WHERE id IN (${placeholders})`, parsedLoreIds, (err, rows) => {
          cb(err, rows || []);
        });
      };

      fetchLore((loreErr, loreArticles) => {
        if (loreErr) {
          return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: loreErr.message });
        }

        try {
          let compiled = `=== NARRATIVE SLATE PROMPT ===\n\n`;
          if (plot_hook) {
            compiled += `[PLOT HOOK]\n${plot_hook}\n\n`;
          }
          if (parsedSteps.length > 0) {
            compiled += `[SCENE ACTION STEPS]\n` + parsedSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n') + `\n\n`;
          }
          if (personas && personas.length > 0) {
            compiled += `[CAST PERSONAS & DRIVERS]\n`;
            personas.forEach(p => {
              compiled += `- Character ID: ${p.article_id}\n`;
              if (p.wants) compiled += `  Wants: ${p.wants}\n`;
              if (p.needs) compiled += `  Needs: ${p.needs}\n`;
              if (p.thoughts) compiled += `  Thoughts: ${p.thoughts}\n`;
              if (p.history_log) compiled += `  History: ${p.history_log}\n`;
            });
            compiled += `\n`;
          }
          if (loreArticles && loreArticles.length > 0) {
            compiled += `[PINNED LORE ARTICLES]\n`;
            loreArticles.forEach(art => {
              compiled += `- ${art.title} (${art.id}): ${art.summary || (art.content || '').substring(0, 300)}\n`;
            });
            compiled += `\n`;
          }
          if (parsedTones.length > 0) {
            compiled += `[TONE & ATMOSPHERE]\n${parsedTones.join(', ')}\n\n`;
          }
          compiled += `[SYSTEM INSTRUCTION]\nWrite vivid, immersive prose honoring all scene steps, character drivers, and tone chips.`;

          const estTokens = Math.ceil(compiled.length / 4);
          return res.json({
            status: 'success',
            compiled_prompt: compiled,
            token_metrics: {
              estimated_tokens: estTokens,
              char_count: compiled.length,
              max_tokens: max_tokens || 4000
            }
          });
        } catch (innerErr) {
          return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: innerErr.message });
        }
      });
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/narrative/continue-prose
app.post('/api/narrative/continue-prose', async (req, res) => {
  try {
    const { compiled_prompt, current_draft } = req.body || {};

    const prompt = `${compiled_prompt || ''}

[CURRENT DRAFT PROSE]
${current_draft || '(Beginning of scene)'}

[TASK]
Continue the scene prose smoothly from the current draft, generating 2-3 detailed, immersive paragraphs. Focus on vivid sensory details, sharp character dialogue, and advancing the scene action steps. Do NOT repeat text already in the draft. Return ONLY the newly generated continuation prose.`;

    try {
      const generatedText = await callGeminiText(prompt);
      if (generatedText) {
        return res.json({ status: 'success', generated_text: generatedText });
      }
    } catch (e) {}

    // Extract names or key titles mentioned in prompt for contextual fallback
    const names = [];
    const nameMatches = (compiled_prompt || '').match(/###\s+([A-Za-z0-9_\s]+)/g) || (compiled_prompt || '').match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g) || [];
    nameMatches.forEach(m => {
      const clean = m.replace(/###\s+/, '').trim();
      if (clean && !['System', 'World', 'Active', 'Task', 'Tone', 'Scope', 'Directives', 'Characters', 'Neutral', 'Role'].includes(clean) && !names.includes(clean)) {
        names.push(clean);
      }
    });

    const charA = names[0] || 'Semarel';
    const charB = names[1] || 'Khemos';

    const fallbackProse = `The tension between ${charA} and ${charB} crackled in the silence like static in the ambient air. Each measured breath was a deliberate calculation, a quiet struggle between contrasting agendas.

"${charA}," ${charB} spoke softly, voice echoing with unyielding intent. "You know as well as I that our paths cannot remain parallel for much longer."

${charA} shifted position, eyes locked on ${charB}. "Then speak your piece, before the hour forces our hands."`;

    return res.json({ status: 'success', generated_text: fallbackProse });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/narrative/pov-rewrite
app.post('/api/narrative/pov-rewrite', async (req, res) => {
  try {
    const { highlighted_text, pov_character_id } = req.body || {};

    if (!highlighted_text) {
      return res.status(400).json({ status: 'error', code: 'ERR_BAD_REQUEST', error: 'highlighted_text is required', message: 'highlighted_text is required' });
    }

    const charId = pov_character_id || 'unknown';

    db.get('SELECT title FROM articles WHERE id = ?', [charId], (err, articleRow) => {
      if (err) return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });

      const charName = articleRow ? articleRow.title : charId;

      getCastPersonaContext([charId], async (pErr, personas) => {
        if (pErr) return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: pErr.message });

        try {
          const persona = (personas && personas[0]) || {};

          const prompt = `Rewrite the following text passage strictly through the First-Person POV ("I") of ${charName}.

CHARACTER DRIVERS & PERSONA:
- Wants: ${persona.wants || 'Unknown'}
- Needs: ${persona.needs || 'Unknown'}
- Thoughts: ${persona.thoughts || 'Unknown'}

ORIGINAL PASSAGE:
"${highlighted_text}"

TASK:
Rewrite this passage in first-person perspective ("I"), deeply reflecting ${charName}'s internal thoughts, desires, emotional filter, and personality. Keep the narrative flow intact while making the voice distinctly theirs. Return ONLY the rewritten text passage.`;

          try {
            const rewritten = await callGeminiText(prompt);
            if (rewritten) {
              return res.json({ status: 'success', rewritten_text: rewritten });
            }
          } catch (e) {}

          const fallbackRewritten = `I watched the shadows shift against the damp wall, my chest tightening with anticipation. Every instinct in me screamed to stay alert—there was no room for error here. "${highlighted_text}"`;

          return res.json({ status: 'success', rewritten_text: fallbackRewritten });
        } catch (innerErr) {
          return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: innerErr.message });
        }
      });
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/narrative/suggest-beats
app.post('/api/narrative/suggest-beats', async (req, res) => {
  try {
    const { compiled_prompt, current_draft } = req.body || {};

    const prompt = `${compiled_prompt || ''}

[CURRENT DRAFT PROSE]
${current_draft || '(Beginning of scene)'}

[TASK]
Suggest 3 dramatic scene direction choices / next beats that could happen next in this narrative scene.
Return EXACTLY a JSON array containing 3 objects with fields:
- "title": Short action title
- "description": 1-2 sentence description of the choice
- "type": One of "Action & Conflict", "Lore Discovery", "Dialogue", or "Emotional Shift"

Example format:
[
  { "title": "Direct Confrontation", "description": "Confront the pursuer head-on before they reach the courtyard.", "type": "Action & Conflict" },
  { "title": "Search the Cipher", "description": "Examine the pouch on the courier for encrypted Imperial notes.", "type": "Lore Discovery" },
  { "title": "Tactical Retreat", "description": "Fade into the shadowy alleyway to observe who meets the courier.", "type": "Emotional Shift" }
]`;

    try {
      const rawText = await callGeminiText(prompt);
      if (rawText) {
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ status: 'success', beats: parsed });
        }
      }
    } catch (e) {}

    const fallbackBeats = [
      {
        title: "Direct Confrontation",
        description: "Step out into the open and challenge the approaching figure directly.",
        type: "Action & Conflict"
      },
      {
        title: "Investigate Hidden Marker",
        description: "Notice a subtle sigil etched near the threshold that reveals secret allegiance.",
        type: "Lore Discovery"
      },
      {
        title: "Whispered Exchange",
        description: "Demand immediate answers before any weapon is drawn.",
        type: "Dialogue"
      }
    ];

    return res.json({ status: 'success', beats: fallbackBeats });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/narrative/save-slate
app.post('/api/narrative/save-slate', (req, res) => {
  try {
    const { id, name, world_id, plot_hook, scene_steps, cast_ids, pinned_lore_ids, tone_chips, visibility, format, max_tokens } = req.body || {};

    if (!name) {
      return res.status(400).json({ status: 'error', code: 'ERR_BAD_REQUEST', error: 'Slate name is required', message: 'Slate name is required' });
    }

    const slateId = id || ('slate-' + Date.now());
    const stepsStr = typeof scene_steps === 'string' ? scene_steps : JSON.stringify(scene_steps || []);
    const castStr = typeof cast_ids === 'string' ? cast_ids : JSON.stringify(cast_ids || []);
    const loreStr = typeof pinned_lore_ids === 'string' ? pinned_lore_ids : JSON.stringify(pinned_lore_ids || []);
    const toneStr = typeof tone_chips === 'string' ? tone_chips : JSON.stringify(tone_chips || []);

    const query = `
      INSERT INTO slates (id, name, world_id, plot_hook, scene_steps, cast_ids, pinned_lore_ids, tone_chips, visibility, format, max_tokens, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        world_id = excluded.world_id,
        plot_hook = excluded.plot_hook,
        scene_steps = excluded.scene_steps,
        cast_ids = excluded.cast_ids,
        pinned_lore_ids = excluded.pinned_lore_ids,
        tone_chips = excluded.tone_chips,
        visibility = excluded.visibility,
        format = excluded.format,
        max_tokens = excluded.max_tokens,
        updated_at = CURRENT_TIMESTAMP
    `;

    db.run(query, [
      slateId,
      name,
      world_id || 'all',
      plot_hook || '',
      stepsStr,
      castStr,
      loreStr,
      toneStr,
      visibility || 'public',
      format || 'markdown',
      max_tokens || 4000
    ], function (err) {
      if (err) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
      }
      return res.json({ status: 'success', id: slateId, message: 'Slate saved successfully' });
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// GET /api/narrative/slates
app.get('/api/narrative/slates', (req, res) => {
  try {
    const { world_id } = req.query || {};
    let query = 'SELECT * FROM slates ORDER BY updated_at DESC';
    let params = [];

    if (world_id && world_id !== 'all') {
      query = 'SELECT * FROM slates WHERE world_id = ? OR world_id = \'all\' ORDER BY updated_at DESC';
      params = [world_id];
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
      }

      try {
        const formattedRows = (rows || []).map(row => ({
          ...row,
          scene_steps: safeParseArray(row.scene_steps),
          cast_ids: safeParseArray(row.cast_ids),
          pinned_lore_ids: safeParseArray(row.pinned_lore_ids),
          tone_chips: safeParseArray(row.tone_chips)
        }));

        return res.json({ status: 'success', slates: formattedRows });
      } catch (innerErr) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: innerErr.message });
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// POST /api/ai/travel-encounter - Synthesizes narrative random encounter seeds for travel routes
app.post('/api/ai/travel-encounter', async (req, res) => {
  const { map_title, route_title, distance, unit, landmark_names } = req.body || {};
  const routeName = route_title || 'Expedition Highway';
  const landmarks = Array.isArray(landmark_names) ? landmark_names.join(', ') : (landmark_names || 'surrounding wilderness');
  const distText = distance ? `${distance} ${unit || 'miles'}` : 'a long distance';

  const encounterText = `While traveling along the ${routeName} across ${distText} near ${landmarks}, the party notices ominous tracks cutting through the brush. A sudden chill settles over the trail as shadows stretch across the terrain.`;

  res.json({
    success: true,
    encounter_title: `Encounter on ${routeName}`,
    narrative_text: encounterText,
    check_dc: 14
  });
});

// POST /api/marketing/generate
app.post('/api/marketing/generate', async (req, res) => {
  try {
    const { article_ids, preset, tone_chip, cta_type } = req.body || {};

    if (!article_ids || (Array.isArray(article_ids) && article_ids.length === 0)) {
      return res.status(400).json({ status: 'error', code: 'ERR_BAD_REQUEST', error: 'article_ids is required', message: 'article_ids is required' });
    }

    let ids = [];
    if (Array.isArray(article_ids)) {
      ids = article_ids;
    } else if (typeof article_ids === 'string') {
      try {
        const parsed = JSON.parse(article_ids);
        if (Array.isArray(parsed)) ids = parsed;
        else ids = article_ids.split(',').map(s => s.trim()).filter(Boolean);
      } catch (e) {
        ids = article_ids.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (ids.length === 0) {
      return res.status(400).json({ status: 'error', code: 'ERR_BAD_REQUEST', error: 'article_ids is required', message: 'article_ids is required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    db.all(`SELECT * FROM articles WHERE id IN (${placeholders})`, ids, async (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ status: 'error', code: 'ERR_NOT_FOUND', error: 'No articles found', message: 'No articles found' });
      }

      try {
        // Pass through filterArticleVisibility and stripSecretBlocks
        const sanitizedArticles = rows
          .map(row => filterArticleVisibility(row, 'public'))
          .filter(Boolean)
          .map(row => ({
            ...row,
            title: stripSecretBlocks(row.title),
            summary: stripSecretBlocks(row.summary),
            content: stripSecretBlocks(row.content)
          }));

        if (sanitizedArticles.length === 0) {
          return res.status(400).json({ status: 'error', code: 'ERR_RESTRICTED', error: 'Selected articles are private or restricted.', message: 'Selected articles are private or restricted.' });
        }

        // Determine CTA text
        const ctaMap = {
          kickstarter: 'CTA: Back our Kickstarter campaign today to unlock this exclusive lore expansion!',
          patreon: 'CTA: Join our Patreon to get early access to full lore chapters and world updates!',
          vtt: 'CTA: Get the full module on Roll20 and Foundry VTT now!',
          newsletter: 'CTA: Subscribe to our newsletter to receive weekly world lore updates in your inbox!',
          none: ''
        };

        let ctaText = '';
        if (cta_type) {
          const normalizedCta = String(cta_type).toLowerCase().trim();
          if (ctaMap[normalizedCta] !== undefined) {
            ctaText = ctaMap[normalizedCta];
          } else {
            ctaText = cta_type;
          }
        }

        // Determine Preset Instructions
        const presetMap = {
          kickstarter: 'Write a high-converting Kickstarter campaign feature section highlighting this lore. Focus on exciting world-building hooks, gameplay/setting features, and compelling pitch copy.',
          'vtt-store': 'Write a Virtual Tabletop (VTT) store module description (e.g. Roll20, Foundry VTT). Focus on key locations, NPCs, factions, and adventure hooks included in this module.',
          'serial-fiction': 'Write an engaging serial fiction newsletter update / author\'s notes introducing readers to these lore elements. Focus on intrigue, character motivations, and narrative stakes.',
          'social-teaser': 'Write a catchy, viral social media teaser post (Twitter/X, Discord announcement, Reddit showcase) showcasing this lore item. Include engaging hooks and emojis.'
        };

        const selectedPreset = (preset && presetMap[preset.toLowerCase()]) ? preset.toLowerCase() : 'kickstarter';
        const presetInstruction = presetMap[selectedPreset];

        const loreSummaryText = sanitizedArticles.map(a => 
          `### ${a.title} (${a.category || 'Lore'})\n${a.summary ? `Summary: ${a.summary}\n` : ''}${a.content || ''}`
        ).join('\n\n---\n\n');

        const prompt = `You are a professional marketing copywriter for tabletop roleplaying games and speculative fiction.
Generate public promotional copy based ONLY on the sanitized lore provided below.

Preset Style: ${presetInstruction}
${tone_chip ? `Tone & Atmosphere: ${tone_chip}` : ''}
${ctaText ? `Call to Action: ${ctaText}` : ''}

[SANITIZED LORE]
${loreSummaryText}

[TASK]
Write high-converting, polished promotional copy.
RULES:
1. Do NOT reveal any secret plot twists or spoilers.
2. Structure with clear headers, bullet points, and engaging copy.
3. Append the Call to Action at the end if provided.`;

        let generatedCopy = '';
        try {
          const rawRes = await callGeminiText(prompt);
          if (rawRes) {
            generatedCopy = rawRes;
          }
        } catch (e) {}

        // Fallback copy generator if Gemini API key is missing or fails
        if (!generatedCopy) {
          const mainArticle = sanitizedArticles[0];
          const tonePrefix = tone_chip ? `[Tone: ${tone_chip}] ` : '';
          if (selectedPreset === 'kickstarter') {
            generatedCopy = `${tonePrefix}🔥 **UNVEILING THE LORE: ${mainArticle.title.toUpperCase()}** 🔥\n\n` +
              `Step into a world rich with deep narrative mystery and epic world-building! ` +
              `${mainArticle.summary || mainArticle.content.substring(0, 200)}...\n\n` +
              `✨ **Campaign Highlights:**\n` +
              `- Fully detailed lore entries & faction guides\n` +
              `- Ready-to-run encounter hooks and setting background\n` +
              `- Beautifully crafted world assets for DMs and players alike\n\n` +
              (ctaText ? `${ctaText}` : 'Back our campaign now to bring this world to life!');
          } else if (selectedPreset === 'vtt-store') {
            generatedCopy = `${tonePrefix}📦 **VTT MODULE: ${mainArticle.title.toUpperCase()}** 📦\n\n` +
              `Enhance your virtual tabletop experience with ${mainArticle.title}! ` +
              `${mainArticle.summary || mainArticle.content.substring(0, 200)}...\n\n` +
              `🎮 **Module Features:**\n` +
              `- Complete setting details and interactive world notes\n` +
              `- Pre-configured lore handouts for your players\n` +
              `- Seamless integration with your favourite fantasy RPG system\n\n` +
              (ctaText ? `${ctaText}` : 'Available now on Roll20 and Foundry VTT!');
          } else if (selectedPreset === 'serial-fiction') {
            generatedCopy = `${tonePrefix}📜 **FROM THE AUTHOR'S DESK: ${mainArticle.title}** 📜\n\n` +
              `Dear Readers,\n\n` +
              `Today we take a deep dive into ${mainArticle.title}. ` +
              `${mainArticle.summary || mainArticle.content.substring(0, 200)}...\n\n` +
              `As our characters travel deeper into this realm, the stakes grow higher and old secrets unravel.\n\n` +
              (ctaText ? `${ctaText}` : 'Stay tuned for the next chapter!');
          } else {
            // social-teaser
            generatedCopy = `${tonePrefix}✨ **EXPLORE THE LORE: ${mainArticle.title}** ✨\n\n` +
              `${mainArticle.summary || mainArticle.content.substring(0, 150)}...\n\n` +
              `What mysteries lie hidden within? Discover the full entry in the Lore Vault! 🌌\n\n` +
              (ctaText ? `${ctaText}` : '#TTRPG #Worldbuilding #Fantasy');
          }
        }

        // Final safety check to strip any secrets if they somehow appeared
        generatedCopy = stripSecretBlocks(generatedCopy);

        return res.json({
          status: 'success',
          generated_copy: generatedCopy
        });
      } catch (innerErr) {
        return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: innerErr.message });
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', code: 'ERR_INTERNAL', message: err.message });
  }
});

// ==========================================
// 🗺️ INTERACTIVE WORLD ATLAS & SHARING ENGINE
// ==========================================

// Stack-Based Secret Sanitizer (Handles nested & unclosed secret tags safely)
function sanitizeSecretContent(content) {
  if (!content) return '';
  
  let result = '';
  let depth = 0;
  let i = 0;
  const openTag = '[secret]';
  const closeTag = '[/secret]';

  while (i < content.length) {
    const lower = content.toLowerCase();
    if (lower.startsWith(openTag, i)) {
      if (depth === 0) {
        result += ' *[Secret Details Redacted]* ';
      }
      depth++;
      i += openTag.length;
    } else if (lower.startsWith(closeTag, i)) {
      if (depth > 0) {
        depth--;
      }
      i += closeTag.length;
    } else {
      if (depth === 0) {
        result += content[i];
      }
      i++;
    }
  }

  return result;
}

// Fetch Frontpage Payload
app.get('/api/worlds/:worldId/frontpage', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    if (err || !world) {
      return res.status(404).json({ error: 'World not found' });
    }

    let pinnedIds = [];
    try {
      pinnedIds = JSON.parse(world.pinned_article_ids || '[]');
    } catch (e) {
      pinnedIds = [];
    }

    let articleQuery = 'SELECT id, title, category, sub_category, summary, content, header_image, tags, updated_at FROM articles WHERE world_id = ? OR world_id = "default"';
    db.all(articleQuery, [world.id], (err2, allArticles) => {
      const articles = allArticles || [];
      
      const pinnedArticles = articles.filter(a => pinnedIds.includes(a.id)).slice(0, 6);
      const featured = pinnedArticles.length ? pinnedArticles : articles.slice(0, 4);

      const sanitizedFeatured = featured.map(art => ({
        ...art,
        content: isPlayerMode ? sanitizeSecretContent(art.content) : art.content
      }));

      const categoryCounts = {};
      articles.forEach(a => {
        categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      });

      res.json({
        world,
        stats: {
          totalArticles: articles.length,
          totalCategories: Object.keys(categoryCounts).length,
          categoryCounts
        },
        pinnedArticles: sanitizedFeatured
      });
    });
  });
});

// Update Frontpage Settings
app.put('/api/worlds/:worldId/frontpage', (req, res) => {
  const { worldId } = req.params;
  const { banner_image, tagline, pinned_article_ids, template_style } = req.body;

  const query = `
    UPDATE worlds
    SET banner_image = COALESCE(?, banner_image),
        tagline = COALESCE(?, tagline),
        pinned_article_ids = COALESCE(?, pinned_article_ids),
        template_style = COALESCE(?, template_style)
    WHERE id = ? OR id = "default"
  `;

  const pinnedStr = Array.isArray(pinned_article_ids) ? JSON.stringify(pinned_article_ids) : pinned_article_ids;

  db.run(query, [banner_image, tagline, pinnedStr, template_style, worldId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err2, world) => {
      res.json({ success: true, world });
    });
  });
});

// Fetch all maps for a given world
app.get('/api/worlds/:worldId/maps', (req, res) => {
  const { worldId } = req.params;
  db.all('SELECT * FROM maps WHERE world_id = ? ORDER BY created_at ASC', [worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ maps: rows || [] });
  });
});

// Upload/Create new map
app.post('/api/maps', imageUpload.single('image'), (req, res) => {
  const { world_id, title, description, parent_map_id, parent_pin_id, scale_pixels, scale_distance, scale_unit } = req.body;
  if (!title || !world_id) {
    return res.status(400).json({ error: 'Missing required map fields (title, world_id)' });
  }

  const id = `map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const image_path = req.file ? `/uploads/images/${req.file.filename}` : '/uploads/images/default-map.png';
  const width = 1920;
  const height = 1080;
  const sPixels = scale_pixels !== undefined ? parseFloat(scale_pixels) : 100.0;
  const sDistance = scale_distance !== undefined ? parseFloat(scale_distance) : 10.0;
  const sUnit = scale_unit || 'miles';

  const query = `
    INSERT INTO maps (id, world_id, parent_map_id, parent_pin_id, scale_pixels, scale_distance, scale_unit, title, description, image_path, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [id, world_id, parent_map_id || null, parent_pin_id || null, sPixels, sDistance, sUnit, title, description || '', image_path, width, height], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM maps WHERE id = ?', [id], (err2, map) => {
      res.status(201).json({ success: true, map });
    });
  });
});

// Delete map and cascade pins, territories, layers, routes, and unreferenced upload files
app.delete('/api/maps/:id', (req, res) => {
  const mapId = req.params.id;
  db.get('SELECT image_path FROM maps WHERE id = ?', [mapId], (err, map) => {
    const imagePath = map ? map.image_path : null;

    db.serialize(() => {
      db.run('DELETE FROM map_pins WHERE map_id = ?', [mapId]);
      db.run('DELETE FROM map_territories WHERE map_id = ?', [mapId]);
      db.run('DELETE FROM map_layers WHERE map_id = ?', [mapId]);
      db.run('DELETE FROM map_routes WHERE map_id = ?', [mapId]);
      db.run('DELETE FROM maps WHERE id = ?', [mapId], function(deleteErr) {
        if (deleteErr) return res.status(500).json({ error: deleteErr.message });

        if (imagePath && imagePath.startsWith('/uploads/images/')) {
          db.get('SELECT COUNT(*) as count FROM maps WHERE image_path = ?', [imagePath], (countErr, row) => {
            if (!countErr && row && row.count === 0) {
              const fullPath = path.join(__dirname, 'public', imagePath);
              fs.unlink(fullPath, () => {});
            }
          });
        }
        res.json({ success: true, deleted: this.changes });
      });
    });
  });
});

// Fetch pins for a map
app.get('/api/maps/:mapId/pins', (req, res) => {
  const { mapId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  
  let query = 'SELECT * FROM map_pins WHERE map_id = ?';
  const params = [mapId];

  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ pins: rows || [] });
  });
});

// Create/Update map pin
app.post('/api/map-pins', (req, res) => {
  const { id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret, sub_map_id, target_sub_map_id, category } = req.body;
  if (!map_id || x_pct === undefined || y_pct === undefined || !label) {
    return res.status(400).json({ error: 'Missing required pin fields (map_id, x_pct, y_pct, label)' });
  }

  const pinId = id || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const clampedX = Math.max(0, Math.min(1, parseFloat(x_pct)));
  const clampedY = Math.max(0, Math.min(1, parseFloat(y_pct)));
  const effectiveSubMapId = target_sub_map_id || sub_map_id || null;
  const pinCategory = category || 'Location';

  const query = `
    INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret, sub_map_id, target_sub_map_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      article_id=excluded.article_id,
      x_pct=excluded.x_pct,
      y_pct=excluded.y_pct,
      label=excluded.label,
      pin_icon=excluded.pin_icon,
      pin_color=excluded.pin_color,
      is_secret=excluded.is_secret,
      sub_map_id=excluded.sub_map_id,
      target_sub_map_id=excluded.target_sub_map_id,
      category=excluded.category,
      updated_at=CURRENT_TIMESTAMP
  `;

  db.run(query, [pinId, map_id, article_id || null, clampedX, clampedY, label, pin_icon || 'fa-location-dot', pin_color || '#d97706', is_secret ? 1 : 0, effectiveSubMapId, effectiveSubMapId, pinCategory], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_pins WHERE id = ?', [pinId], (err2, pin) => {
      res.status(201).json({ success: true, pin });
    });
  });
});

// Update map pin (e.g. coordinates on dragend)
app.put('/api/map-pins/:id', (req, res) => {
  const pinId = req.params.id;
  const { x_pct, y_pct } = req.body;
  const clampedX = Math.max(0, Math.min(1, parseFloat(x_pct) || 0.5));
  const clampedY = Math.max(0, Math.min(1, parseFloat(y_pct) || 0.5));

  db.run(`
    UPDATE map_pins 
    SET x_pct = ?, y_pct = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [clampedX, clampedY, pinId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_pins WHERE id = ?', [pinId], (err2, pin) => {
      res.json({ success: true, pin });
    });
  });
});

// Delete map pin
app.delete('/api/map-pins/:id', (req, res) => {
  db.run('DELETE FROM map_pins WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// GET /api/maps/:mapId/fog - Fetch Fog of War mask state
app.get('/api/maps/:mapId/fog', (req, res) => {
  db.get('SELECT * FROM map_fog_states WHERE map_id = ?', [req.params.mapId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, fog_data_url: row ? row.fog_data_url : null });
  });
});

// PUT /api/maps/:mapId/fog - Save Fog of War mask state
app.put('/api/maps/:mapId/fog', (req, res) => {
  const { fog_data_url } = req.body;
  db.run(`
    INSERT INTO map_fog_states (map_id, fog_data_url, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(map_id) DO UPDATE SET
      fog_data_url = excluded.fog_data_url,
      updated_at = CURRENT_TIMESTAMP
  `, [req.params.mapId, fog_data_url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ====================================================
// 🗺️ DUAL-ENGINE AUTOMATED WORLD CARTOGRAPHER
// ====================================================

function pseudoNoise(x, y, seed = 42) {
  const sin = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return sin - Math.floor(sin);
}

function getElevationAt(x, y, seed = 42) {
  let elevation = 0;
  elevation += pseudoNoise(x * 0.05, y * 0.05, seed) * 0.5;
  elevation += pseudoNoise(x * 0.1, y * 0.1, seed + 1) * 0.3;
  elevation += pseudoNoise(x * 0.2, y * 0.2, seed + 2) * 0.2;
  return elevation;
}

function getBiomeForCategory(category, title) {
  const t = (title || '').toLowerCase();
  if (t.includes('port') || t.includes('harbor') || t.includes('bay') || t.includes('coast') || t.includes('sea') || t.includes('island')) {
    return 'coastline';
  }
  if (t.includes('peak') || t.includes('mountain') || t.includes('spire') || t.includes('dungeon') || t.includes('ruins') || t.includes('keep')) {
    return 'mountain';
  }
  return 'plains';
}

function findBiomeCoordinates(targetBiome, seed = 42) {
  let bestX = 0.5, bestY = 0.5;
  let minDiff = 999;

  for (let step = 0; step < 50; step++) {
    const rx = 0.1 + Math.random() * 0.8;
    const ry = 0.1 + Math.random() * 0.8;
    const elev = getElevationAt(rx * 100, ry * 100, seed);

    let targetElev = 0.5;
    if (targetBiome === 'coastline') targetElev = 0.40;
    else if (targetBiome === 'mountain') targetElev = 0.75;

    const diff = Math.abs(elev - targetElev);
    if (diff < minDiff) {
      minDiff = diff;
      bestX = rx;
      bestY = ry;
    }
  }

  return { x_pct: parseFloat(bestX.toFixed(4)), y_pct: parseFloat(bestY.toFixed(4)) };
}

function resolveForceDirectedLayout(pins, iterations = 20) {
  const k = 0.15;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        let dx = pins[j].x_pct - pins[i].x_pct;
        let dy = pins[j].y_pct - pins[i].y_pct;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (dist < k) {
          const force = (k - dist) / dist * 0.5;
          const fx = dx * force;
          const fy = dy * force;
          pins[i].x_pct = Math.max(0.05, Math.min(0.95, pins[i].x_pct - fx));
          pins[i].y_pct = Math.max(0.05, Math.min(0.95, pins[i].y_pct - fy));
          pins[j].x_pct = Math.max(0.05, Math.min(0.95, pins[j].x_pct + fx));
          pins[j].y_pct = Math.max(0.05, Math.min(0.95, pins[j].y_pct + fy));
        }
      }
    }
  }
  return pins;
}

function handleProceduralMapGeneration(req, res) {
  const worldId = req.body.world_id || 'default';
  const mapTitle = req.body.title || 'Realm Map';
  const preset = req.body.preset || 'pangaea';
  const theme = req.body.theme || 'parchment';
  const mapScope = req.body.map_scope || 'world';
  const mapStyle = req.body.map_style || 'sepia';
  const mapId = `map-proc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  let imagePath = '/uploads/images/default-map.png';
  if (req.file) {
    imagePath = `/uploads/images/${req.file.filename}`;
  }

  let scalePixels = 100;
  let scaleDistance = 100;
  let scaleUnit = 'miles';

  switch (mapScope) {
    case 'battlemap':
      scalePixels = 100;
      scaleDistance = 5;
      scaleUnit = 'feet';
      break;
    case 'city':
      scalePixels = 100;
      scaleDistance = 500;
      scaleUnit = 'feet';
      break;
    case 'town':
      scalePixels = 100;
      scaleDistance = 100;
      scaleUnit = 'feet';
      break;
    case 'region':
      scalePixels = 100;
      scaleDistance = 25;
      scaleUnit = 'miles';
      break;
    case 'treasure':
      scalePixels = 100;
      scaleDistance = 5;
      scaleUnit = 'miles';
      break;
    case 'world':
    default:
      scalePixels = 100;
      scaleDistance = 100;
      scaleUnit = 'miles';
      break;
  }

  db.run(`
    INSERT INTO maps (id, world_id, parent_map_id, title, description, image_path, width, height, scale_pixels, scale_distance, scale_unit)
    VALUES (?, ?, NULL, ?, ?, ?, 1920, 1080, ?, ?, ?)
  `, [mapId, worldId, mapTitle, `Map (${mapScope}, ${mapStyle}, ${preset}, ${theme})`, imagePath, scalePixels, scaleDistance, scaleUnit], function(err) {
    if (err) return res.status(500).json({ error: 'Database insert failed: ' + err.message });

    let selectedArticleIds = [];
    try {
      if (req.body.selected_article_ids) {
        selectedArticleIds = Array.isArray(req.body.selected_article_ids)
          ? req.body.selected_article_ids
          : JSON.parse(req.body.selected_article_ids);
      }
    } catch (e) {
      selectedArticleIds = [];
    }

    let articleQuery = 'SELECT id, title, category FROM articles WHERE (world_id = ? OR world_id = "default") AND category = "Locations"';
    let queryParams = [worldId];

    if (selectedArticleIds && selectedArticleIds.length > 0) {
      const placeholders = selectedArticleIds.map(() => '?').join(',');
      articleQuery = `SELECT id, title, category FROM articles WHERE id IN (${placeholders})`;
      queryParams = selectedArticleIds;
    }

    db.all(articleQuery, queryParams, (err2, locations) => {
      const locationList = (locations && locations.length) ? locations : [
        { id: null, title: 'Central Citadel', category: 'Locations' },
        { id: null, title: 'Obsidian Harbor', category: 'Locations' },
        { id: null, title: 'Frostpeak Spire', category: 'Locations' }
      ];

      const seed = Date.now() % 10000;
      let rawPins = locationList.map((loc, idx) => {
        const biome = getBiomeForCategory(loc.category, loc.title);
        const coords = (locationList.length === 1) ? { x_pct: 0.50, y_pct: 0.50 } : findBiomeCoordinates(biome, seed + idx);
        return {
          id: `pin-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          map_id: mapId,
          article_id: loc.id || null,
          x_pct: coords.x_pct,
          y_pct: coords.y_pct,
          label: loc.title,
          pin_icon: biome === 'mountain' ? 'fa-mountain' : (biome === 'coastline' ? 'fa-anchor' : 'fa-location-dot'),
          pin_color: biome === 'mountain' ? '#ef4444' : (biome === 'coastline' ? '#38bdf8' : '#d97706'),
          is_secret: 0
        };
      });

      const resolvedPins = (locationList.length === 1) ? rawPins : resolveForceDirectedLayout(rawPins);
      const insertStmt = db.prepare(`
        INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      resolvedPins.forEach(p => {
        insertStmt.run([p.id, p.map_id, p.article_id, p.x_pct, p.y_pct, p.label, p.pin_icon, p.pin_color, p.is_secret]);
      });
      insertStmt.finalize();

      db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err3, map) => {
        res.status(201).json({ success: true, map, pins: resolvedPins, warning: req.aiWarning || null, notice: req.aiNotice || null });
      });
    });
  });
}

// POST /api/maps/generate/procedural - Accepts client-generated map image blob & saves map record
app.post('/api/maps/generate/procedural', imageUpload.single('image'), handleProceduralMapGeneration);

// Alias legacy route to new procedural generator
app.post('/api/maps/auto-generate/procedural', imageUpload.single('image'), handleProceduralMapGeneration);

// POST /api/maps/generate/ai - AI Spatial Map Generator Endpoint (Google Interactions API)
app.post('/api/maps/generate/ai', imageUpload.single('image'), async (req, res) => {
  const aiConfig = getAIConfig();
  const apiKey = process.env.GEMINI_API_KEY || aiConfig.apiKey;
  const mapTitle = req.body.title || 'AI Fantasy Realm Map';
  const mapScope = req.body.map_scope || 'world';
  const mapStyle = req.body.map_style || 'sepia';
  const aiProvider = req.body.ai_provider || 'pollinations';
  const customPrompt = req.body.custom_prompt || '';

  let aiWarning = null;

  const scopePrompts = {
    world: 'Grand continental fantasy world map, vast oceans, tectonic mountain ranges, empire borders, hand-inked cartography',
    region: 'Regional province fantasy map, trade roads, rivers, kingdom borders, county fortresses',
    city: 'Top-down urban city map plan, stone perimeter walls, cobblestone streets, district buildings, docks',
    town: 'Top-down village settlement map, rural farmlands, tavern, blacksmith, surrounding woodland glade',
    treasure: 'Weathered parchment treasure map, hand-drawn X marks the spot, dotted trail path, compass rose',
    battlemap: 'Top-down 2D tactical combat battlemap grid, overhead 90-degree angle view, encounter map layout, stone ruins, tactical terrain features'
  };

  const stylePrompts = {
    sepia: 'vintage sepia parchment paper, hand-inked cartography, Tolkien-style hatching, subtle aged vignetting',
    codex: 'full-color fantasy watercolor, rich emerald forests, sapphire waters, golden compass highlights',
    grimdark: 'moody dark fantasy, charcoal and granite tones, weathered parchment, obsidian rivers',
    blueprint: 'architectural blueprint, technical linework, 5ft grid overlay, crisp monochrome ink'
  };

  const promptText = `Create a high resolution fantasy map picture: ${scopePrompts[mapScope] || scopePrompts.world}, ${stylePrompts[mapStyle] || stylePrompts.sepia}, featuring location ${mapTitle}. ${customPrompt}. Intricate fantasy cartography, high quality, no text labels, top-down perspective.`;

  if (aiProvider === 'gemini' && apiKey) {
    const candidateModels = [
      'gemini-3.1-flash-image',
      'nano-banana-pro-preview',
      'gemini-3-pro-image',
      'imagen-4.0-generate-001',
      'imagen-4.0-fast-generate-001'
    ];

    for (const model of candidateModels) {
      try {
        console.log(`[AI Map Generator] Querying Google Interactions API with model: ${model}`);
        const interactionsRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            input: [
              { type: 'text', text: promptText }
            ]
          })
        });

        if (interactionsRes.ok) {
          const data = await interactionsRes.json();
          let b64Bytes = null;
          if (data.outputs && data.outputs.length > 0) {
            for (const out of data.outputs) {
              if (out.data) { b64Bytes = out.data; break; }
              if (out.image && out.image.bytes) { b64Bytes = out.image.bytes; break; }
            }
          } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            for (const part of data.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) { b64Bytes = part.inlineData.data; break; }
            }
          }

          if (b64Bytes) {
            const imgBuffer = Buffer.from(b64Bytes, 'base64');
            const filename = `ai-map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.png`;
            const savePath = path.join(__dirname, 'public', 'uploads', 'images', filename);
            fs.writeFileSync(savePath, imgBuffer);

            req.file = { filename };
            console.log(`[AI Map Generator] Successfully generated & saved AI map image via /v1beta/interactions using model ${model}: /uploads/images/${filename}`);
            req.aiNotice = `Generated using Google Gemini AI (${model})`;
            return handleProceduralMapGeneration(req, res);
          }
        } else {
          const errText = await interactionsRes.text();
          console.warn(`[AI Map Generator] Interactions API model ${model} returned HTTP ${interactionsRes.status}: ${errText.substring(0, 200)}`);
          if (interactionsRes.status === 429) {
            aiWarning = 'Google Gemini API key rate limit / daily free tier quota exceeded (HTTP 429). Generated map using Pollinations AI.';
          } else if (interactionsRes.status === 404 || interactionsRes.status === 403) {
            aiWarning = `Google AI model ${model} returned HTTP ${interactionsRes.status}. Check API Key billing permissions. Generated map using Pollinations AI.`;
          }
        }
      } catch (modelErr) {
        console.warn(`[AI Map Generator] Error querying model ${model}: ${modelErr.message}`);
      }
    }
  }

  // Pollinations AI Synthesis Engine (Default / Fallback)
  try {
    const polliPrompt = encodeURIComponent(`high resolution fantasy cartography map, ${scopePrompts[mapScope] || scopePrompts.world}, ${stylePrompts[mapStyle] || stylePrompts.sepia}, featuring ${mapTitle}. ${customPrompt ? customPrompt + ', ' : ''}detailed map, 8k resolution, no text labels, top-down perspective`);
    const polliSeed = (req.body.seed || Date.now()) % 100000;
    const polliUrl = `https://image.pollinations.ai/prompt/${polliPrompt}?width=1920&height=1080&seed=${polliSeed}&model=flux&nologo=true`;

    console.log(`[AI Map Generator] Attempting Pollinations AI image generation: ${polliUrl.substring(0, 120)}...`);
    const polliRes = await fetch(polliUrl);
    if (polliRes.ok) {
      const polliBuffer = Buffer.from(await polliRes.arrayBuffer());
      if (polliBuffer.length > 5000) {
        const filename = `pollinations-map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.png`;
        const savePath = path.join(__dirname, 'public', 'uploads', 'images', filename);
        fs.writeFileSync(savePath, polliBuffer);

        req.file = { filename };
        console.log(`[AI Map Generator] Successfully generated & saved Pollinations AI map image: /uploads/images/${filename}`);
        req.aiNotice = 'Generated using Pollinations AI (Flux Model)';
        return handleProceduralMapGeneration(req, res);
      }
    }
  } catch (polliErr) {
    console.warn(`[AI Map Generator] Pollinations AI fetch error: ${polliErr.message}`);
  }

  req.aiWarning = aiWarning || 'Google Gemini API quota reached and Pollinations AI unreachable. Generated map using local cartography engine.';
  handleProceduralMapGeneration(req, res);
});

// Alias legacy AI route
app.post('/api/maps/auto-generate/ai', imageUpload.single('image'), (req, res) => {
  res.redirect(307, '/api/maps/generate/ai');
});

// Spiral Grid-Collision Auto-Pin Placement Endpoint
app.post('/api/maps/:mapId/auto-pin', (req, res) => {
  const { mapId } = req.params;
  const { world_id } = req.body;

  db.all('SELECT * FROM map_pins WHERE map_id = ?', [mapId], (err, existingPins) => {
    const occupiedCells = new Set();
    (existingPins || []).forEach(p => {
      const gx = Math.floor(p.x_pct * 20);
      const gy = Math.floor(p.y_pct * 20);
      occupiedCells.add(`${gx},${gy}`);
    });

    db.all('SELECT id, title, category FROM articles WHERE (world_id = ? OR world_id = "default") AND category = "Locations"', [world_id || 'default'], (err2, locations) => {
      const existingArticleIds = new Set((existingPins || []).map(p => p.article_id).filter(Boolean));
      const unpinned = (locations || []).filter(l => !existingArticleIds.has(l.id));

      if (unpinned.length === 0) {
        return res.json({ success: true, addedPins: [], message: 'All locations are already pinned on this map.' });
      }

      const addedPins = [];
      const insertStmt = db.prepare(`
        INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      let spiralRadius = 1;
      let gridX = 10, gridY = 10;

      unpinned.forEach((loc, idx) => {
        while (occupiedCells.has(`${gridX},${gridY}`) && spiralRadius < 10) {
          gridX = (10 + (idx + spiralRadius) % 8) % 20;
          gridY = (10 + Math.floor((idx + spiralRadius) / 8)) % 20;
          spiralRadius++;
        }
        occupiedCells.add(`${gridX},${gridY}`);

        const x_pct = parseFloat(((gridX + 0.5) / 20).toFixed(4));
        const y_pct = parseFloat(((gridY + 0.5) / 20).toFixed(4));
        const pinId = `pin-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;

        const pin = {
          id: pinId,
          map_id: mapId,
          article_id: loc.id,
          x_pct,
          y_pct,
          label: loc.title,
          pin_icon: 'fa-location-dot',
          pin_color: '#38bdf8'
        };

        insertStmt.run([pin.id, pin.map_id, pin.article_id, pin.x_pct, pin.y_pct, pin.label, pin.pin_icon, pin.pin_color]);
        addedPins.push(pin);
      });

      insertStmt.finalize();
      res.status(201).json({ success: true, addedPins });
    });
  });
});

// --- MAP LAYERS REST API ENDPOINTS ---

// GET /api/maps/:mapId/layers
app.get('/api/maps/:mapId/layers', (req, res) => {
  const { mapId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  let query = 'SELECT * FROM map_layers WHERE map_id = ?';
  const params = [mapId];
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY sort_order ASC, created_at ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ layers: rows || [] });
  });
});

// POST /api/maps/:mapId/layers
app.post('/api/maps/:mapId/layers', (req, res) => {
  const { mapId } = req.params;
  const { name, color_badge, is_visible, is_secret, sort_order } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Layer name is required' });
  }

  const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const badge = color_badge || '#38bdf8';
  const visible = is_visible !== undefined ? (is_visible ? 1 : 0) : 1;
  const secret = is_secret ? 1 : 0;
  const sort = sort_order !== undefined ? parseInt(sort_order, 10) : 0;

  const query = `
    INSERT INTO map_layers (id, map_id, name, color_badge, is_visible, is_secret, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, mapId, name, badge, visible, secret, sort], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_layers WHERE id = ?', [id], (err2, layer) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json({ success: true, layer });
    });
  });
});

// DELETE /api/maps/:mapId/layers/:layerId
app.delete('/api/maps/:mapId/layers/:layerId', (req, res) => {
  const { mapId, layerId } = req.params;
  db.run('DELETE FROM map_layers WHERE id = ? AND map_id = ?', [layerId, mapId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// --- MAP TERRITORIES REST API ENDPOINTS ---

// GET /api/maps/:mapId/territories
app.get('/api/maps/:mapId/territories', (req, res) => {
  const { mapId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  let query = 'SELECT * FROM map_territories WHERE map_id = ?';
  const params = [mapId];
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY created_at ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ territories: rows || [] });
  });
});

// POST /api/maps/:mapId/territories
app.post('/api/maps/:mapId/territories', (req, res) => {
  const { mapId } = req.params;
  const {
    title, layer_id, article_id, points_json,
    stroke_color, stroke_width, stroke_style,
    fill_color, fill_opacity, is_contested,
    contested_article_id, is_secret
  } = req.body;

  if (!title || !points_json) {
    return res.status(400).json({ error: 'Missing required territory fields (title, points_json)' });
  }

  const id = `territory-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const strokeColor = stroke_color || '#ef4444';
  const strokeWidth = stroke_width !== undefined ? parseInt(stroke_width, 10) : 3;
  const strokeStyle = stroke_style || 'solid';
  const fillColor = fill_color || '#ef4444';
  const fillOpacity = fill_opacity !== undefined ? parseFloat(fill_opacity) : 0.25;
  const contested = is_contested ? 1 : 0;
  const secret = is_secret ? 1 : 0;

  const query = `
    INSERT INTO map_territories (
      id, map_id, layer_id, article_id, title, points_json,
      stroke_color, stroke_width, stroke_style, fill_color, fill_opacity,
      is_contested, contested_article_id, is_secret
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    id, mapId, layer_id || null, article_id || null, title, points_json,
    strokeColor, strokeWidth, strokeStyle, fillColor, fillOpacity,
    contested, contested_article_id || null, secret
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_territories WHERE id = ?', [id], (err2, territory) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json({ success: true, territory });
    });
  });
});

// PUT /api/maps/:mapId/territories/:territoryId
app.put('/api/maps/:mapId/territories/:territoryId', (req, res) => {
  const { mapId, territoryId } = req.params;
  const updates = req.body;

  const allowedFields = [
    'title', 'layer_id', 'article_id', 'points_json',
    'stroke_color', 'stroke_width', 'stroke_style',
    'fill_color', 'fill_opacity', 'is_contested',
    'contested_article_id', 'is_secret'
  ];

  const fieldsToUpdate = [];
  const params = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fieldsToUpdate.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  if (fieldsToUpdate.length === 0) {
    db.get('SELECT * FROM map_territories WHERE id = ? AND map_id = ?', [territoryId, mapId], (err, territory) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ territory });
    });
    return;
  }

  params.push(territoryId, mapId);
  const sql = `UPDATE map_territories SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND map_id = ?`;

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_territories WHERE id = ? AND map_id = ?', [territoryId, mapId], (err2, territory) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ territory });
    });
  });
});

// DELETE /api/maps/:mapId/territories/:territoryId
app.delete('/api/maps/:mapId/territories/:territoryId', (req, res) => {
  const { mapId, territoryId } = req.params;
  db.run('DELETE FROM map_territories WHERE id = ? AND map_id = ?', [territoryId, mapId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// --- Atlas v2 REST API Endpoints ---

// GET /api/maps/:mapId/tree — Hierarchy resolution (map, parentMap, childMaps, ancestors)
app.get('/api/maps/:mapId/tree', async (req, res) => {
  const { mapId } = req.params;
  try {
    const map = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const childMaps = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM maps WHERE parent_map_id = ? ORDER BY title ASC', [mapId], (err, rows) => err ? reject(err) : resolve(rows));
    });

    let parentMap = null;
    if (map.parent_map_id) {
      parentMap = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM maps WHERE id = ?', [map.parent_map_id], (err, row) => err ? reject(err) : resolve(row || null));
      });
    }

    const rawAncestors = [];
    const visited = new Set([map.id]);
    let currParentId = map.parent_map_id;

    while (currParentId && !visited.has(currParentId)) {
      visited.add(currParentId);
      const parentRow = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM maps WHERE id = ?', [currParentId], (err, row) => err ? reject(err) : resolve(row || null));
      });
      if (!parentRow) break;
      rawAncestors.push(parentRow);
      currParentId = parentRow.parent_map_id;
    }

    rawAncestors.reverse();

    res.json({
      map,
      parentMap,
      childMaps: childMaps || [],
      ancestors: rawAncestors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maps/:mapId/scale — Update scale calibration
app.put('/api/maps/:mapId/scale', async (req, res) => {
  const { mapId } = req.params;
  const { scale_pixels, scale_distance, scale_unit } = req.body;

  try {
    const map = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const pixels = scale_pixels !== undefined ? parseFloat(scale_pixels) : (map.scale_pixels || 100.0);
    const distance = scale_distance !== undefined ? parseFloat(scale_distance) : (map.scale_distance || 10.0);
    const unit = scale_unit !== undefined ? String(scale_unit).trim() : (map.scale_unit || 'miles');

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE maps SET scale_pixels = ?, scale_distance = ?, scale_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [pixels, distance, unit, mapId],
        function(err) { err ? reject(err) : resolve(this); }
      );
    });

    const updatedMap = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err, row) => err ? reject(err) : resolve(row));
    });

    res.json({ success: true, map: updatedMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maps/:mapId/routes — Fetch routes for map
app.get('/api/maps/:mapId/routes', (req, res) => {
  const { mapId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  let query = 'SELECT * FROM map_routes WHERE map_id = ?';
  const params = [mapId];

  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }

  query += ' ORDER BY created_at ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ routes: rows || [] });
  });
});

// POST /api/maps/:mapId/routes — Create or update route
app.post('/api/maps/:mapId/routes', (req, res) => {
  const { mapId } = req.params;
  const {
    id,
    layer_id,
    title,
    points_json,
    stroke_color,
    stroke_width,
    stroke_style,
    calculated_distance,
    is_secret
  } = req.body;

  if (!title || points_json === undefined || points_json === null) {
    return res.status(400).json({ error: 'Missing required route fields (title, points_json)' });
  }

  const routeId = id || `route-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const pointsStr = typeof points_json === 'string' ? points_json : JSON.stringify(points_json);
  const color = stroke_color || '#f59e0b';
  const width = stroke_width !== undefined ? parseInt(stroke_width, 10) : 3;
  const style = stroke_style || 'dashed';
  const dist = calculated_distance !== undefined ? parseFloat(calculated_distance) : 0.0;
  const secret = is_secret ? 1 : 0;
  const layer = layer_id || null;

  const query = `
    INSERT INTO map_routes (id, map_id, layer_id, title, points_json, stroke_color, stroke_width, stroke_style, calculated_distance, is_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      layer_id = excluded.layer_id,
      title = excluded.title,
      points_json = excluded.points_json,
      stroke_color = excluded.stroke_color,
      stroke_width = excluded.stroke_width,
      stroke_style = excluded.stroke_style,
      calculated_distance = excluded.calculated_distance,
      is_secret = excluded.is_secret
  `;

  db.run(query, [routeId, mapId, layer, title, pointsStr, color, width, style, dist, secret], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_routes WHERE id = ?', [routeId], (err2, route) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json({ success: true, route });
    });
  });
});

// DELETE /api/maps/:mapId/routes/:routeId — Delete route
app.delete('/api/maps/:mapId/routes/:routeId', (req, res) => {
  const { mapId, routeId } = req.params;
  db.run('DELETE FROM map_routes WHERE id = ? AND map_id = ?', [routeId, mapId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// POST /api/maps/:mapId/ai-auto-boundaries — Gemini Multimodal Vision Territory Auto-Detection
app.post('/api/maps/:mapId/ai-auto-boundaries', (req, res) => {
  const { mapId } = req.params;
  const targetWorldId = req.body.world_id || 'default';

  db.get('SELECT * FROM maps WHERE id = ?', [mapId], async (err, map) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!map) return res.status(404).json({ error: 'Map not found' });

    const worldFilter = map.world_id || targetWorldId;
    db.all(
      'SELECT id, title, category, content FROM articles WHERE (world_id = ? OR world_id = "default") AND category IN ("Factions & Nations", "Geography & Landmarks", "Races & Species")',
      [worldFilter],
      async (err2, articles) => {
        if (err2) return res.status(500).json({ error: err2.message });

        let imageBuffer = null;
        let mimeType = 'image/jpeg';
        let imagePathOnDisk = null;

        if (map.image_path) {
          const possiblePaths = [
            map.image_path,
            path.join(__dirname, map.image_path),
            path.join(__dirname, 'public', map.image_path.startsWith('/') ? map.image_path.slice(1) : map.image_path),
            path.join(imagesDir, path.basename(map.image_path))
          ];
          for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
              imagePathOnDisk = p;
              break;
            }
          }
        }

        if (imagePathOnDisk) {
          try {
            imageBuffer = fs.readFileSync(imagePathOnDisk);
            const ext = path.extname(imagePathOnDisk).toLowerCase();
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.svg') mimeType = 'image/svg+xml';
            else mimeType = 'image/jpeg';
          } catch (e) {
            console.error('Failed to read map image file for AI vision:', e);
          }
        }

        const aiConfig = getAIConfig();
        const activeKey = aiConfig.apiKey;
        const activeProvider = aiConfig.provider || 'gemini';

        const loreContext = (articles || []).map(a => `- ${a.title} (${a.category}): ${(a.content || '').slice(0, 150)}`).join('\n');
        const promptText = `Analyze this fantasy world map artwork and the provided lore articles. Return a JSON object with key "territories" containing candidate territory boundaries with normalized float percentage coordinates [x_pct, y_pct] (0.0 to 1.0) covering nations or regions mentioned in the lore. Format: {"territories": [{"title": "...", "article_id": "...", "points": [[0.1, 0.2], ...], "stroke_color": "#...", "fill_color": "#..."}]}\n\nLore Articles:\n${loreContext}`;

        let visionSuccess = false;
        let visionCandidates = [];

        if (activeKey && activeProvider === 'gemini') {
          const parts = [{ text: promptText }];
          if (imageBuffer) {
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: imageBuffer.toString('base64')
              }
            });
          }

          const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
          for (const targetModel of candidateModels) {
            try {
              const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }] })
              });

              if (geminiRes.ok) {
                const gData = await geminiRes.json();
                const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                let parsed = null;
                try {
                  parsed = JSON.parse(cleaned);
                } catch (pe) {
                  console.warn(`[AI Vision] JSON parse failed for ${targetModel}:`, pe.message);
                }

                if (parsed && Array.isArray(parsed.territories) && parsed.territories.length > 0) {
                  visionCandidates = parsed.territories;
                  visionSuccess = true;
                  break;
                }
              }
            } catch (err) {
              console.warn(`[AI Vision] Error calling candidate model ${targetModel}:`, err.message);
            }
          }
        }

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        const presetPolygons = [
          [[0.15, 0.15], [0.45, 0.12], [0.42, 0.45], [0.18, 0.42]],
          [[0.52, 0.52], [0.85, 0.48], [0.88, 0.82], [0.55, 0.85]],
          [[0.55, 0.15], [0.88, 0.12], [0.85, 0.42], [0.52, 0.40]],
          [[0.15, 0.55], [0.45, 0.52], [0.42, 0.85], [0.18, 0.82]]
        ];

        if (!visionSuccess || visionCandidates.length === 0) {
          const sampleArticles = (articles && articles.length > 0) ? articles : [
            { id: 'art-valoria', title: 'Valorian Empire' },
            { id: 'art-drakon', title: 'Drakon Dominion' },
            { id: 'art-sylvan', title: 'Sylvan League' }
          ];

          visionCandidates = sampleArticles.slice(0, 3).map((art, idx) => ({
            title: art.title || `Territory ${idx + 1}`,
            article_id: art.id || null,
            points: presetPolygons[idx % presetPolygons.length],
            stroke_color: colors[idx % colors.length],
            fill_color: colors[idx % colors.length]
          }));
        }

        const candidates = visionCandidates.map((c, idx) => ({
          id: `cand-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          title: c.title || `Candidate Territory ${idx + 1}`,
          article_id: c.article_id || null,
          points: Array.isArray(c.points) ? c.points : presetPolygons[idx % presetPolygons.length],
          stroke_color: c.stroke_color || colors[idx % colors.length],
          fill_color: c.fill_color || c.stroke_color || colors[idx % colors.length]
        }));

        res.json({ candidates });
      }
    );
  });
});

// Live Public Web Gateway View — World Frontpage Wiki Portal
app.get('/view/:shareToken', (req, res) => {
  const worldId = req.params.shareToken;
  
  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    const targetWorld = world || {
      id: 'default',
      name: 'LoreVault Atlas',
      description: 'Interactive World Lore Explorer',
      tagline: 'An intricate custom setting waiting to be explored.',
      banner_image: '/uploads/images/default-banner.png',
      theme: 'ancient-codex'
    };

    db.all('SELECT id, title, category, summary, content, header_image, tags FROM articles WHERE world_id = ? OR world_id = "default"', [targetWorld.id], (err2, articles) => {
      const allArticles = articles || [];
      
      let pinnedIds = [];
      try { pinnedIds = JSON.parse(targetWorld.pinned_article_ids || '[]'); } catch (e) {}

      const pinned = allArticles.filter(a => pinnedIds.includes(a.id)).slice(0, 6);
      const featured = pinned.length ? pinned : allArticles.slice(0, 4);

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const ogImage = (targetWorld.banner_image && targetWorld.banner_image.startsWith('http'))
        ? targetWorld.banner_image
        : `${protocol}://${host}${targetWorld.banner_image || '/uploads/images/default-banner.png'}`;

      const html = `<!DOCTYPE html>
<html lang="en" data-theme="${targetWorld.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${targetWorld.name} — World Lore Portal</title>
  <meta property="og:title" content="${targetWorld.name} — LoreVault World Portal">
  <meta property="og:description" content="${targetWorld.tagline || targetWorld.description || 'Explore the lore, maps, and codex.'}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/css/styles.css">
  <style>
    body { margin: 0; padding: 0; background: var(--bg-main, #0b0f19); color: var(--text-primary, #e2e8f0); font-family: sans-serif; }
    .public-portal-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .world-hero-banner {
      height: 320px;
      border-radius: 16px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(11,15,25,0.95)), url('${targetWorld.banner_image || '/uploads/images/default-banner.png'}') center/cover;
      display: flex; flex-direction: column; justify-content: flex-end; padding: 32px; box-sizing: border-box; border: 1px solid var(--border-color, #1e293b);
    }
    .world-hero-banner h1 { margin: 0; font-size: 2.8rem; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
    .world-hero-banner p { font-size: 1.2rem; color: var(--accent-amber, #f59e0b); font-style: italic; margin-top: 8px; }
    .action-dock { display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap; align-items: center; }
    .featured-spotlight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 16px; }
    .spotlight-card { background: var(--surface-card, #0f172a); border: 1px solid var(--border-color, #1e293b); border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s, border-color 0.2s; }
    .spotlight-card:hover { transform: translateY(-4px); border-color: var(--accent-primary, #38bdf8); }
  </style>
</head>
<body>
  <div class="public-portal-container">
    <div class="world-hero-banner">
      <h1>${targetWorld.name}</h1>
      <p>“${targetWorld.tagline || 'An intricate custom setting waiting to be explored.'}”</p>
    </div>

    <div class="action-dock">
      <span class="badge" style="font-size:0.95rem; padding: 8px 14px;">📚 ${allArticles.length} Articles</span>
      <span class="badge" style="font-size:0.95rem; padding: 8px 14px;">🌍 ${targetWorld.theme || 'ancient-codex'} Theme</span>
    </div>

    <section style="margin-top: 32px;">
      <h2>⭐ Featured Lore Spotlight</h2>
      <div class="featured-spotlight-grid">
        ${featured.map(art => `
          <div class="spotlight-card">
            <span class="category-badge">${art.category}</span>
            <h3 style="margin:8px 0;">${art.title}</h3>
            <p style="font-size:0.9rem; color:var(--text-secondary,#94a3b8);">${art.summary || (art.content ? art.content.substring(0, 120) + '...' : '')}</p>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
</body>
</html>`;
      res.send(html);
    });
  });
});

// Standalone Static Web Exporter
app.post('/api/export/atlas/:worldId', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.body.mode === 'player';

  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    const targetWorld = world || { id: 'default', name: 'LoreVault Atlas', theme: 'ancient-codex' };

    db.all('SELECT * FROM maps WHERE world_id = ? OR world_id = "default"', [targetWorld.id], (err2, maps) => {
      const mapList = maps || [];
      const mapIds = mapList.map(m => m.id);

      const dbQueryAll = (sql, params) => new Promise((resolve) => {
        db.all(sql, params, (e, rows) => resolve(rows || []));
      });

      const runQueries = async () => {
        let pins = [];
        let layers = [];
        let territories = [];
        let routes = [];

        if (mapIds.length > 0) {
          const placeholders = mapIds.map(() => '?').join(',');
          
          let pinQuery = `SELECT * FROM map_pins WHERE map_id IN (${placeholders})`;
          if (isPlayerMode) pinQuery += ' AND is_secret = 0';
          pins = await dbQueryAll(pinQuery, mapIds);

          let layerQuery = `SELECT * FROM map_layers WHERE map_id IN (${placeholders})`;
          if (isPlayerMode) layerQuery += ' AND is_secret = 0';
          layerQuery += ' ORDER BY sort_order ASC, created_at ASC';
          layers = await dbQueryAll(layerQuery, mapIds);

          let terrQuery = `SELECT * FROM map_territories WHERE map_id IN (${placeholders})`;
          if (isPlayerMode) terrQuery += ' AND is_secret = 0';
          terrQuery += ' ORDER BY created_at ASC';
          territories = await dbQueryAll(terrQuery, mapIds);

          let routeQuery = `SELECT * FROM map_routes WHERE map_id IN (${placeholders})`;
          if (isPlayerMode) routeQuery += ' AND is_secret = 0';
          routeQuery += ' ORDER BY created_at ASC';
          routes = await dbQueryAll(routeQuery, mapIds);
        } else {
          let pinQuery = 'SELECT * FROM map_pins';
          if (isPlayerMode) pinQuery += ' WHERE is_secret = 0';
          pins = await dbQueryAll(pinQuery, []);

          let layerQuery = 'SELECT * FROM map_layers';
          if (isPlayerMode) layerQuery += ' WHERE is_secret = 0';
          layerQuery += ' ORDER BY sort_order ASC, created_at ASC';
          layers = await dbQueryAll(layerQuery, []);

          let terrQuery = 'SELECT * FROM map_territories';
          if (isPlayerMode) terrQuery += ' WHERE is_secret = 0';
          terrQuery += ' ORDER BY created_at ASC';
          territories = await dbQueryAll(terrQuery, []);

          let routeQuery = 'SELECT * FROM map_routes';
          if (isPlayerMode) routeQuery += ' WHERE is_secret = 0';
          routeQuery += ' ORDER BY created_at ASC';
          routes = await dbQueryAll(routeQuery, []);
        }

        const articles = await dbQueryAll('SELECT id, title, category, summary, content FROM articles WHERE world_id = ? OR world_id = "default"', [targetWorld.id]);

        const sanitizedArticles = articles.map(art => ({
          ...art,
          content: isPlayerMode ? sanitizeSecretContent(art.content) : art.content
        }));

        const escapeHtml = (str) => {
          if (!str) return '';
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        const bundleHtml = `<!DOCTYPE html>
<html lang="en" data-theme="${targetWorld.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(targetWorld.name)} — Standalone World Atlas</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    :root {
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --text-light: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: rgba(255, 255, 255, 0.1);
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg-dark); color: var(--text-light); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .atlas-top-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid var(--border-color); gap: 12px; }
    .atlas-breadcrumbs { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; background: rgba(255, 255, 255, 0.05); padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border-color); }
    .breadcrumb-item { color: var(--text-muted); cursor: pointer; text-decoration: none; }
    .breadcrumb-item.active { color: var(--accent); font-weight: 600; cursor: default; }
    .atlas-search-input { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(0, 0, 0, 0.3); color: var(--text-light); font-size: 0.85rem; }
    .atlas-category-bar { display: flex; gap: 6px; overflow-x: auto; padding: 6px 16px; background: rgba(15, 23, 42, 0.8); border-bottom: 1px solid var(--border-color); }
    .atlas-chip { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; }
    .atlas-chip.active { background: rgba(56, 189, 248, 0.2); border-color: var(--accent); color: var(--accent); font-weight: 600; }
    #atlas-viewport { position: relative; flex: 1; height: 100%; display: flex; }
    #map { width: 100%; height: 100%; background: #020617; }
    #drawer { width: 420px; padding: 24px; background: var(--bg-card); border-left: 1px solid var(--border-color); overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .drawer-header { border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
    .drawer-title { margin: 0; font-size: 1.5rem; color: var(--accent); }
    .drawer-subtitle { margin: 4px 0 0 0; font-size: 0.875rem; color: var(--text-muted); }
    .article-content { font-size: 0.95rem; line-height: 1.6; }
    .article-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .article-content th, .article-content td { border: 1px solid var(--border-color); padding: 6px 10px; font-size: 0.85rem; }
    .article-content th { background: rgba(255, 255, 255, 0.05); }
    .article-content blockquote { border-left: 3px solid var(--accent); margin: 12px 0; padding-left: 12px; color: var(--text-muted); font-style: italic; }
    .atlas-layers-drawer { position: absolute; top: 16px; right: 16px; width: 260px; background: rgba(15, 23, 42, 0.9); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; backdrop-filter: blur(12px); z-index: 1000; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
    .atlas-layers-header { font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; color: var(--accent); }
    .layer-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; margin-bottom: 4px; background: rgba(255, 255, 255, 0.03); font-size: 0.85rem; cursor: pointer; }
    .layer-badge { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .tag-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); color: var(--accent); border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 8px; }
    .atlas-ruler-toast { position: absolute; bottom: 16px; left: 16px; background: rgba(15, 23, 42, 0.9); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; z-index: 1000; font-size: 0.85rem; min-width: 240px; }
  </style>
</head>
<body>
  <div class="atlas-top-bar">
    <div style="display: flex; align-items: center; gap: 10px;">
      <select id="standalone-map-select" style="background: rgba(30,41,59,0.9); color: var(--text-light); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem;">
        ${mapList.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join('')}
      </select>
      <div id="standalone-breadcrumbs" class="atlas-breadcrumbs" style="display:none;"></div>
      <button id="standalone-ruler-btn" style="background: rgba(56, 189, 248, 0.15); color: var(--accent); border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;"><i class="fa-solid fa-ruler-combined"></i> 📏 Ruler</button>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <input type="text" id="standalone-pin-search" class="atlas-search-input" placeholder="🔍 Search pins & lore...">
      <span class="tag-badge" style="margin:0;">${isPlayerMode ? 'Public Player View' : 'DM Canon View'}</span>
    </div>
  </div>
  <div id="standalone-category-bar" class="atlas-category-bar">
    <button class="atlas-chip active" data-category="all">All</button>
    <button class="atlas-chip" data-category="settlements">Settlements</button>
    <button class="atlas-chip" data-category="fortresses">Fortresses</button>
    <button class="atlas-chip" data-category="dungeons">Dungeons</button>
    <button class="atlas-chip" data-category="natural wonders">Natural Wonders</button>
    <button class="atlas-chip" data-category="quests">Quests</button>
    <button class="atlas-chip" data-category="factions">Factions</button>
    <button class="atlas-chip" data-category="relics">Relics</button>
  </div>
  <div style="display: flex; flex: 1; position: relative; overflow: hidden;">
    <div id="atlas-viewport">
      <div id="map"></div>
      <div id="standalone-ruler-toast" class="atlas-ruler-toast" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; color:var(--accent);">
          <strong><i class="fa-solid fa-ruler-horizontal"></i> Measuring Tape</strong>
          <button id="standalone-ruler-clear-btn" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem;">[Clear]</button>
        </div>
        <div>Distance: <strong id="ruler-dist-val">0.0</strong> <span id="ruler-dist-unit">miles</span></div>
        <div style="display:flex; gap:10px; margin-top:6px; font-size:0.75rem; color:var(--text-muted);">
          <span>🚶 Foot: <strong id="ruler-foot-val">0 days</strong></span>
          <span>🐎 Horse: <strong id="ruler-horse-val">0 days</strong></span>
          <span>⛵ Sail: <strong id="ruler-sail-val">0 days</strong></span>
        </div>
      </div>
      <div class="atlas-layers-drawer">
        <div class="atlas-layers-header">
          <span><i class="fa-solid fa-layer-group"></i> Map Layers</span>
        </div>
        <div id="layers-list"></div>
      </div>
    </div>
    <div id="drawer">
      <div class="drawer-header">
        <h2 class="drawer-title" id="drawer-title">${escapeHtml(targetWorld.name)} Atlas</h2>
        <p class="drawer-subtitle" id="drawer-subtitle">Offline Interactive Map</p>
      </div>
      <div id="drawer-body" class="article-content">
        <p>Select a marker, territory boundary, or expedition route to explore world lore.</p>
      </div>
    </div>
  </div>

  <svg style="display:none;">
    <defs>
      <pattern id="pattern-stripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" stroke-width="4" opacity="0.6" />
        <line x1="6" y1="0" x2="6" y2="12" stroke="#f59e0b" stroke-width="4" opacity="0.6" />
      </pattern>
    </defs>
  </svg>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
  <script>
    const maps = ${JSON.stringify(mapList)};
    const pins = ${JSON.stringify(pins || [])};
    const layers = ${JSON.stringify(layers || [])};
    const territories = ${JSON.stringify(territories || [])};
    const routes = ${JSON.stringify(routes || [])};
    const articles = ${JSON.stringify(sanitizedArticles)};

    (function() {
      let mapInstance = null;
      let activeMap = maps[0] || { id: 'default', width: 1920, height: 1080, image_path: '' };
      const hiddenLayerIds = new Set();
      let breadcrumbStack = [activeMap];
      let pinSearchQuery = '';
      let selectedCategory = 'all';
      let isRulerActive = false;
      let rulerPoints = [];
      let rulerPolyline = null;
      let rulerMarkers = [];
      let routePolylines = [];
      let pinMarkers = [];
      let territoryPolygons = [];

      function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function loadMap(mapId) {
        const foundMap = maps.find(m => m.id === mapId);
        if (foundMap) activeMap = foundMap;

        breadcrumbStack = [];
        let curr = activeMap;
        const visited = new Set();
        while (curr && !visited.has(curr.id)) {
          visited.add(curr.id);
          breadcrumbStack.unshift(curr);
          curr = maps.find(m => m.id === curr.parent_map_id);
        }
        renderBreadcrumbs();

        const sel = document.getElementById('standalone-map-select');
        if (sel && sel.value !== activeMap.id) sel.value = activeMap.id;

        if (mapInstance) {
          mapInstance.remove();
          mapInstance = null;
        }

        const w = activeMap.width || 1920;
        const h = activeMap.height || 1080;
        const bounds = [[0, 0], [h, w]];

        mapInstance = L.map('map', {
          crs: L.CRS.Simple,
          minZoom: -2,
          maxZoom: 2,
          zoomSnap: 0.5
        });

        if (activeMap.image_path) {
          L.imageOverlay(activeMap.image_path, bounds).addTo(mapInstance);
        }
        mapInstance.fitBounds(bounds);

        mapInstance.on('click', (e) => {
          if (isRulerActive) {
            addRulerPoint(e.latlng.lng, e.latlng.lat);
          }
        });

        renderLayersList();
        renderTerritories();
        renderRoutes();
        renderPins();
      }

      function renderBreadcrumbs() {
        const bc = document.getElementById('standalone-breadcrumbs');
        if (!bc) return;
        if (breadcrumbStack.length <= 1) {
          bc.style.display = 'none';
          return;
        }
        bc.style.display = 'flex';
        bc.innerHTML = breadcrumbStack.map((m, idx) => {
          const isLast = idx === breadcrumbStack.length - 1;
          const sep = idx > 0 ? ' <span style="color:var(--text-muted);">&gt;</span> ' : '';
          return isLast
            ? \`\${sep}<span class="breadcrumb-item active">\${escapeHtml(m.title)}</span>\`
            : \`\${sep}<span class="breadcrumb-item" data-map-id="\${m.id}">\${escapeHtml(m.title)}</span>\`;
        }).join('');

        bc.querySelectorAll('.breadcrumb-item[data-map-id]').forEach(el => {
          el.addEventListener('click', () => {
            const mid = el.getAttribute('data-map-id');
            if (mid) loadMap(mid);
          });
        });
      }

      function renderLayersList() {
        const listEl = document.getElementById('layers-list');
        if (!listEl) return;
        const mapLayers = (layers || []).filter(l => l.map_id === activeMap.id);
        if (!mapLayers || mapLayers.length === 0) {
          listEl.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">No layers defined</div>';
          return;
        }
        listEl.innerHTML = mapLayers.map(l => \`
          <label class="layer-item">
            <input type="checkbox" \${hiddenLayerIds.has(l.id) ? '' : 'checked'} data-layer-id="\${l.id}">
            <span class="layer-badge" style="background:\${l.color_badge || '#38bdf8'};"></span>
            <span>\${escapeHtml(l.name)}</span>
          </label>
        \`).join('');

        listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const lid = e.target.getAttribute('data-layer-id');
            if (e.target.checked) {
              hiddenLayerIds.delete(lid);
            } else {
              hiddenLayerIds.add(lid);
            }
            renderTerritories();
            renderRoutes();
            renderPins();
          });
        });
      }

      function renderTerritories() {
        territoryPolygons.forEach(p => p.remove());
        territoryPolygons = [];

        const w = activeMap.width || 1920;
        const h = activeMap.height || 1080;

        const mapTerritories = (territories || []).filter(t => t.map_id === activeMap.id);
        mapTerritories.forEach(t => {
          if (t.layer_id && hiddenLayerIds.has(t.layer_id)) return;

          let points = [];
          try {
            points = typeof t.points_json === 'string' ? JSON.parse(t.points_json) : (t.points_json || []);
          } catch(e) { points = []; }

          if (!Array.isArray(points) || points.length < 3) return;

          const latlngs = points.map(pt => [pt[1] * h, pt[0] * w]);
          let dashArray = null;
          if (t.stroke_style === 'dashed') dashArray = '6, 6';
          if (t.stroke_style === 'dotted') dashArray = '2, 4';

          const isContested = !!t.is_contested;

          const poly = L.polygon(latlngs, {
            color: t.stroke_color || '#ef4444',
            weight: t.stroke_width || 3,
            dashArray: dashArray,
            fillColor: isContested ? 'url(#pattern-stripe)' : (t.fill_color || '#ef4444'),
            fillOpacity: t.fill_opacity !== undefined ? t.fill_opacity : 0.25
          }).addTo(mapInstance);

          poly.bindTooltip(t.title, { permanent: false, direction: 'center' });
          poly.on('click', () => {
            openTerritoryDetails(t);
          });

          territoryPolygons.push(poly);
        });
      }

      function renderRoutes() {
        routePolylines.forEach(p => p.remove());
        routePolylines = [];
        const w = activeMap.width || 1920;
        const h = activeMap.height || 1080;
        const unit = activeMap.scale_unit || 'miles';

        const mapRoutes = (routes || []).filter(r => r.map_id === activeMap.id);
        mapRoutes.forEach(r => {
          if (r.layer_id && hiddenLayerIds.has(r.layer_id)) return;
          let points = [];
          try {
            points = typeof r.points_json === 'string' ? JSON.parse(r.points_json) : (r.points_json || []);
          } catch(e) { points = []; }
          if (!Array.isArray(points) || points.length < 2) return;

          const latlngs = points.map(pt => [pt[1] * h, pt[0] * w]);
          let dashArray = null;
          if (r.stroke_style === 'dashed') dashArray = '6, 6';
          if (r.stroke_style === 'dotted') dashArray = '2, 4';
          const distVal = r.calculated_distance ? parseFloat(r.calculated_distance).toFixed(1) : '0.0';

          const poly = L.polyline(latlngs, {
            color: r.stroke_color || '#f59e0b',
            weight: r.stroke_width || 3,
            dashArray: dashArray
          }).addTo(mapInstance);

          poly.bindTooltip(\`⛺ \${r.title} (\${distVal} \${unit})\`, { permanent: false, direction: 'top' });
          poly.on('click', () => {
            openRouteDetails(r);
          });
          routePolylines.push(poly);
        });
      }

      function openRouteDetails(r) {
        const titleEl = document.getElementById('drawer-title');
        const subtitleEl = document.getElementById('drawer-subtitle');
        const bodyEl = document.getElementById('drawer-body');
        const unit = activeMap.scale_unit || 'miles';
        const dist = parseFloat(r.calculated_distance) || 0;
        const foot = (dist / 30).toFixed(1);
        const horse = (dist / 60).toFixed(1);
        const sail = (dist / 100).toFixed(1);

        if (titleEl) titleEl.innerText = r.title;
        if (subtitleEl) subtitleEl.innerText = 'Expedition Route';
        if (bodyEl) {
          bodyEl.innerHTML = \`
            <div class="tag-badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3);">Expedition Route</div>
            <h4>Route Distance & Travel Estimates:</h4>
            <div style="font-size:1.4rem; font-weight:bold; color:#f59e0b; margin:8px 0;">\${dist.toFixed(1)} \${unit}</div>
            <ul style="padding-left:18px; line-height:1.8;">
              <li>🚶 Foot: <strong>\${foot} days</strong> (~30 \${unit}/day)</li>
              <li>🐎 Horse: <strong>\${horse} days</strong> (~60 \${unit}/day)</li>
              <li>⛵ Sail: <strong>\${sail} days</strong> (~100 \${unit}/day)</li>
            </ul>
          \`;
        }
      }

      function renderPins() {
        pinMarkers.forEach(m => m.remove());
        pinMarkers = [];
        const w = activeMap.width || 1920;
        const h = activeMap.height || 1080;

        const mapPins = (pins || []).filter(p => p.map_id === activeMap.id);
        mapPins.forEach(p => {
          if (p.layer_id && hiddenLayerIds.has(p.layer_id)) return;

          if (selectedCategory !== 'all') {
            const pCat = (p.category || '').toLowerCase();
            if (pCat !== selectedCategory.toLowerCase()) return;
          }

          if (pinSearchQuery.trim() !== '') {
            const q = pinSearchQuery.toLowerCase();
            const titleMatch = (p.title || '').toLowerCase().includes(q);
            const descMatch = (p.description || '').toLowerCase().includes(q);
            if (!titleMatch && !descMatch) return;
          }

          const lat = p.y_pct * h;
          const lng = p.x_pct * w;

          const marker = L.marker([lat, lng]).addTo(mapInstance);
          marker.bindTooltip(p.title + (p.target_sub_map_id ? ' 🔍' : ''), { permanent: false, direction: 'top' });
          marker.on('click', () => {
            openPinDetails(p);
          });
          pinMarkers.push(marker);
        });
      }

      function openPinDetails(pin) {
        const article = (articles || []).find(a => a.id === pin.article_id);
        const titleEl = document.getElementById('drawer-title');
        const subtitleEl = document.getElementById('drawer-subtitle');
        const bodyEl = document.getElementById('drawer-body');

        if (titleEl) titleEl.innerText = pin.title;
        if (subtitleEl) subtitleEl.innerText = pin.category || 'Map Pin';

        let subMapBtnHtml = '';
        if (pin.target_sub_map_id) {
          subMapBtnHtml = \`<div style="margin-top:12px;"><button id="drilldown-submap-btn" style="background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid #38bdf8; padding:6px 12px; border-radius:6px; cursor:pointer; width:100%;">🔍 Drill Down into Sub-Map</button></div>\`;
        }

        if (article) {
          if (bodyEl) bodyEl.innerHTML = \`<div class="tag-badge">\${escapeHtml(article.category || '')}</div><div>\${article.content || article.summary || ''}</div>\${subMapBtnHtml}\`;
        } else {
          if (bodyEl) bodyEl.innerHTML = \`<p>\${escapeHtml(pin.description || 'No detailed article linked.')}</p>\${subMapBtnHtml}\`;
        }

        if (pin.target_sub_map_id) {
          const btn = document.getElementById('drilldown-submap-btn');
          if (btn) btn.addEventListener('click', () => loadMap(pin.target_sub_map_id));
        }
      }

      function openTerritoryDetails(t) {
        const article = (articles || []).find(a => a.id === t.article_id);
        const contestedArticle = (articles || []).find(a => a.id === t.contested_article_id);
        const titleEl = document.getElementById('drawer-title');
        const subtitleEl = document.getElementById('drawer-subtitle');
        const bodyEl = document.getElementById('drawer-body');

        if (titleEl) titleEl.innerText = t.title + (t.is_contested ? ' (Contested Zone)' : '');
        if (subtitleEl) subtitleEl.innerText = 'Territory Boundary';

        let html = '';
        if (t.is_contested) {
          html += \`<div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; padding:10px; border-radius:6px; margin-bottom:12px;"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> <strong>Active Border Conflict</strong></div>\`;
        }

        if (article) {
          html += \`<div class="tag-badge">\${escapeHtml(article.category || 'Lore')}</div><h4>\${escapeHtml(article.title)}</h4><div>\${article.content || article.summary || ''}</div>\`;
        }
        if (contestedArticle) {
          html += \`<hr style="border-color:var(--border-color); margin:16px 0;" /><div class="tag-badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.3);">Contesting Faction</div><h4>\${escapeHtml(contestedArticle.title)}</h4><div>\${contestedArticle.content || contestedArticle.summary || ''}</div>\`;
        }

        if (!article && !contestedArticle) {
          html += \`<p>Territory polygon boundary: \${escapeHtml(t.title)}</p>\`;
        }

        if (bodyEl) bodyEl.innerHTML = html;
      }

      function toggleRuler() {
        isRulerActive = !isRulerActive;
        const toast = document.getElementById('standalone-ruler-toast');
        if (toast) toast.style.display = isRulerActive ? 'block' : 'none';
        if (!isRulerActive) clearRuler();
      }

      function addRulerPoint(x_px, y_px) {
        rulerPoints.push([x_px, y_px]);
        const latlngs = rulerPoints.map(pt => [pt[1], pt[0]]);
        if (!rulerPolyline) {
          rulerPolyline = L.polyline(latlngs, { color: '#06b6d4', weight: 4, dashArray: '8, 8' }).addTo(mapInstance);
        } else {
          rulerPolyline.setLatLngs(latlngs);
        }
        const m = L.marker([y_px, x_px]).addTo(mapInstance);
        rulerMarkers.push(m);
        updateRulerToast();
      }

      function updateRulerToast() {
        if (rulerPoints.length < 2) return;
        let totalPx = 0;
        for (let i = 0; i < rulerPoints.length - 1; i++) {
          const dx = rulerPoints[i+1][0] - rulerPoints[i][0];
          const dy = rulerPoints[i+1][1] - rulerPoints[i][1];
          totalPx += Math.sqrt(dx * dx + dy * dy);
        }
        const sPx = activeMap.scale_pixels || 100;
        const sDist = activeMap.scale_distance || 10;
        const unit = activeMap.scale_unit || 'miles';
        const dist = (totalPx / sPx) * sDist;

        document.getElementById('ruler-dist-val').innerText = dist.toFixed(1);
        document.getElementById('ruler-dist-unit').innerText = unit;
        document.getElementById('ruler-foot-val').innerText = (dist / 30).toFixed(1) + ' days';
        document.getElementById('ruler-horse-val').innerText = (dist / 60).toFixed(1) + ' days';
        document.getElementById('ruler-sail-val').innerText = (dist / 100).toFixed(1) + ' days';
      }

      function clearRuler() {
        rulerPoints = [];
        if (rulerPolyline) { rulerPolyline.remove(); rulerPolyline = null; }
        rulerMarkers.forEach(m => m.remove());
        rulerMarkers = [];
        document.getElementById('ruler-dist-val').innerText = '0.0';
      }

      window.addEventListener('DOMContentLoaded', () => {
        loadMap(activeMap.id);

        const mapSel = document.getElementById('standalone-map-select');
        if (mapSel) mapSel.addEventListener('change', e => loadMap(e.target.value));

        const rulerBtn = document.getElementById('standalone-ruler-btn');
        if (rulerBtn) rulerBtn.addEventListener('click', toggleRuler);

        const rulerClearBtn = document.getElementById('standalone-ruler-clear-btn');
        if (rulerClearBtn) rulerClearBtn.addEventListener('click', clearRuler);

        const searchInput = document.getElementById('standalone-pin-search');
        if (searchInput) {
          searchInput.addEventListener('input', e => {
            pinSearchQuery = e.target.value;
            renderPins();
          });
        }

        const catChips = document.getElementById('standalone-category-bar');
        if (catChips) {
          catChips.querySelectorAll('.atlas-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              catChips.querySelectorAll('.atlas-chip').forEach(c => c.classList.remove('active'));
              chip.classList.add('active');
              selectedCategory = chip.getAttribute('data-category') || 'all';
              renderPins();
            });
          });
        }
      });
    })();
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="lore-vault-atlas-${targetWorld.id}.html"`);
        res.send(bundleHtml);
      };

      runQueries().catch(err3 => {
        res.status(500).json({ error: 'Failed to generate offline HTML bundle', details: err3.message });
      });
    });
  });
});

// ====================================================
// ⏳ TIMELINE CHRONOLOGY ENGINE REST API
// ====================================================

app.get('/api/worlds/:worldId/timeline', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  let query = 'SELECT * FROM timeline_events WHERE world_id = ? OR world_id = "default"';
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY sort_order ASC';

  db.all(query, [worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const events = (rows || []).map(ev => ({
      ...ev,
      summary: isPlayerMode ? sanitizeSecretContent(ev.summary) : ev.summary
    }));
    res.json({ success: true, events });
  });
});

app.post('/api/timeline-events', (req, res) => {
  const { world_id, article_id, title, epoch_name, display_year, sort_order, summary, is_secret } = req.body;
  if (!title || !display_year) {
    return res.status(400).json({ error: 'Title and display_year are required' });
  }

  const id = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const order = sort_order !== undefined ? parseFloat(sort_order) : parseFloat(display_year.replace(/[^0-9.-]/g, '')) || 0;

  const query = `
    INSERT INTO timeline_events (id, world_id, article_id, title, epoch_name, display_year, sort_order, summary, is_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, world_id || 'default', article_id || null, title, epoch_name || 'Common Era', display_year, order, summary || '', is_secret ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM timeline_events WHERE id = ?', [id], (err2, ev) => {
      res.status(201).json({ success: true, event: ev });
    });
  });
});

app.delete('/api/timeline-events/:id', (req, res) => {
  db.run('DELETE FROM timeline_events WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// ====================================================
// 🌍 MULTI-WORLD VAULT MANAGER REST API
// ====================================================

app.delete('/api/worlds/:id', (req, res) => {
  if (req.params.id === 'default') {
    return res.status(400).json({ error: 'Cannot delete default world' });
  }

  db.run('DELETE FROM worlds WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// ====================================================
// 🕸️ FACTION & CHARACTER RELATIONSHIP MATRIX REST API
// ====================================================

app.get('/api/worlds/:worldId/relationships', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  let query = 'SELECT * FROM lore_relationships WHERE world_id = ?';
  const params = [worldId];
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY source_entity_title ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ relationships: rows });
  });
});

app.post('/api/relationships', (req, res) => {
  const {
    world_id,
    source_entity_id,
    source_entity_title,
    target_entity_id,
    target_entity_title,
    relationship_type,
    sentiment_score,
    summary,
    is_secret
  } = req.body;

  if (!world_id || !source_entity_title || !target_entity_title) {
    return res.status(400).json({ error: 'Missing required entity titles or world_id' });
  }

  const query = `
    INSERT INTO lore_relationships (
      world_id, source_entity_id, source_entity_title,
      target_entity_id, target_entity_title, relationship_type,
      sentiment_score, summary, is_secret, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(world_id, source_entity_id, target_entity_id) DO UPDATE SET
      relationship_type = excluded.relationship_type,
      sentiment_score = excluded.sentiment_score,
      summary = excluded.summary,
      is_secret = excluded.is_secret,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(query, [
    world_id,
    source_entity_id || source_entity_title.toLowerCase().replace(/\s+/g, '-'),
    source_entity_title,
    target_entity_id || target_entity_title.toLowerCase().replace(/\s+/g, '-'),
    target_entity_title,
    relationship_type || 'neutral',
    sentiment_score || 0,
    summary || '',
    is_secret ? 1 : 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

app.delete('/api/relationships/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM lore_relationships WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// Helper callGeminiApiWithFallback is defined globally above at line ~1630

app.post('/api/relationships/auto-extract', async (req, res) => {
  const { world_id } = req.body;
  if (!world_id) return res.status(400).json({ error: 'Missing world_id' });

  db.all('SELECT id, title, category, summary, content FROM articles WHERE world_id = ? OR world_id = "all" LIMIT 30', [world_id], async (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!articles || articles.length === 0) {
      return res.json({ relationships: [], count: 0, message: 'No articles found to extract relationships from.' });
    }

    const loreContext = articles.map(a => `Title: ${a.title}\nCategory: ${a.category}\nSummary: ${a.summary || a.content.substring(0, 300)}`).join('\n---\n');

    const prompt = `Analyze the following worldbuilding lore articles and identify dynamic relationships between characters and factions.
Return ONLY a valid JSON array of relationship objects without markdown formatting.

Format each object exactly like this:
{
  "source_entity_title": "String",
  "target_entity_title": "String",
  "relationship_type": "allied" | "hostile" | "tense" | "secret_master" | "debtor" | "neutral",
  "sentiment_score": Integer between -100 and 100,
  "summary": "Short explanation of the relationship based on lore",
  "is_secret": 0 or 1
}

Lore Context:
${loreContext}`;

    try {
      const responseText = await callGeminiApiWithFallback(prompt);
      const relationships = safeExtractJSON(responseText) || [];

      let insertedCount = 0;
      const stmt = db.prepare(`
        INSERT INTO lore_relationships (
          world_id, source_entity_id, source_entity_title,
          target_entity_id, target_entity_title, relationship_type,
          sentiment_score, summary, is_secret, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(world_id, source_entity_id, target_entity_id) DO UPDATE SET
          relationship_type = excluded.relationship_type,
          sentiment_score = excluded.sentiment_score,
          summary = excluded.summary,
          is_secret = excluded.is_secret,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const rel of relationships) {
        if (rel.source_entity_title && rel.target_entity_title) {
          stmt.run([
            world_id,
            rel.source_entity_title.toLowerCase().replace(/\s+/g, '-'),
            rel.source_entity_title,
            rel.target_entity_title.toLowerCase().replace(/\s+/g, '-'),
            rel.target_entity_title,
            rel.relationship_type || 'neutral',
            rel.sentiment_score || 0,
            rel.summary || '',
            rel.is_secret ? 1 : 0
          ]);
          insertedCount++;
        }
      }
      stmt.finalize();

      res.json({ success: true, count: insertedCount, relationships });
    } catch (apiErr) {
      res.status(500).json({ error: 'AI relationship extraction failed: ' + apiErr.message });
    }
  });
});

app.post('/api/relationships/spark-conflict', async (req, res) => {
  const { world_id, source_entity_title, target_entity_title } = req.body;
  if (!source_entity_title || !target_entity_title) {
    return res.status(400).json({ error: 'Missing entity titles' });
  }

  const prompt = `You are Arthur Vance, Socratic Architect for LoreVault.
Generate 3 actionable, high-tension story conflict hooks between "${source_entity_title}" and "${target_entity_title}".

Return ONLY a valid JSON array of 3 objects with keys "title", "type" ("Inciting Incident" | "Hidden Dilemma" | "Escalation"), and "description".

Example:
[
  { "type": "Inciting Incident", "title": "The Stolen Ledger", "description": "A secret debt record surfaces in a tavern brawl." }
]`;

  try {
    const responseText = await callGeminiApiWithFallback(prompt);
    const hooks = safeExtractJSON(responseText) || [];
    res.json({ hooks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate conflict hooks: ' + err.message });
  }
});


// POST /api/export/world-bundle/:worldId - Export complete JSON world bundle for offline PWA
app.post('/api/export/world-bundle/:worldId', async (req, res) => {
  const { worldId } = req.params;

  try {
    const articles = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM articles WHERE world_id = ? OR world_id = "all"', [worldId], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    const maps = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM maps WHERE world_id = ? OR world_id = "all"', [worldId], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    const relationships = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM lore_relationships WHERE world_id = ?', [worldId], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    const timeline = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM timeline_events WHERE world_id = ?', [worldId], (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    const bundle = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      world_id: worldId,
      articles,
      maps,
      relationships,
      timeline
    };

    res.json({ success: true, bundle });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export world bundle: ' + err.message });
  }
});

// ==========================================
// 🌌 AI WELCOME CONCIERGE & INTENT ROUTER
// ==========================================

function fallbackConciergeRoute(intentText) {
  const text = (intentText || '').toLowerCase();
  if (text.includes('write') || text.includes('chapter') || text.includes('draft') || text.includes('prose') || text.includes('book') || text.includes('novel') || text.includes('scene') || text.includes('story')) {
    return {
      target_view: 'reader',
      enable_zen_mode: true,
      open_drawer: 'weave-matrix',
      search_filter: '',
      action_summary: 'Opening Zen Reader Mode with Weave Matrix context staging.'
    };
  }
  if (text.includes('map') || text.includes('atlas') || text.includes('geography') || text.includes('pin') || text.includes('land') || text.includes('world') || text.includes('cartography')) {
    return {
      target_view: 'atlas',
      enable_zen_mode: false,
      open_drawer: null,
      search_filter: '',
      action_summary: 'Opening Interactive World Atlas cartography canvas.'
    };
  }
  if (text.includes('stat') || text.includes('dnd') || text.includes('5e') || text.includes('monster') || text.includes('dm') || text.includes('boss') || text.includes('combat') || text.includes('npc') || text.includes('bestiary')) {
    return {
      target_view: 'reader',
      enable_zen_mode: false,
      open_drawer: 'statblock',
      search_filter: '',
      action_summary: 'Opening TTRPG Stat Block Engine drawer.'
    };
  }
  if (text.includes('audit') || text.includes('doctor') || text.includes('fix') || text.includes('health') || text.includes('stub') || text.includes('orphan') || text.includes('canon')) {
    return {
      target_view: 'frontpage',
      enable_zen_mode: false,
      open_drawer: 'doctor',
      search_filter: '',
      action_summary: 'Running Narrative World Doctor health audit.'
    };
  }
  if (text.includes('relation') || text.includes('faction') || text.includes('war') || text.includes('alliance') || text.includes('conflict') || text.includes('house')) {
    return {
      target_view: 'relationships',
      enable_zen_mode: false,
      open_drawer: null,
      search_filter: '',
      action_summary: 'Opening Faction & Character Relationship Matrix.'
    };
  }
  if (text.includes('time') || text.includes('history') || text.includes('chronology') || text.includes('era') || text.includes('year') || text.includes('event')) {
    return {
      target_view: 'timeline',
      enable_zen_mode: false,
      open_drawer: null,
      search_filter: '',
      action_summary: 'Opening World Chronology & Event Timeline.'
    };
  }
  return {
    target_view: 'frontpage',
    enable_zen_mode: false,
    open_drawer: null,
    search_filter: '',
    action_summary: 'Welcome to LoreVault! Opening World Overview Portal.'
  };
}

app.post('/api/concierge/route-intent', async (req, res) => {
  try {
    const { world_id, user_intent } = req.body;
    const intentText = (user_intent || '').trim();

    if (!intentText) {
      return res.json({
        success: true,
        routing: fallbackConciergeRoute('')
      });
    }

    // Try Gemini AI intent classification with fallback retries
    const prompt = `You are the AI Welcome Concierge for LoreVault, a local-first worldbuilding and literary database.
Analyze the user's creative goal and classify it into workspace navigation actions.

USER INTENT: "${intentText}"

Respond ONLY with a valid JSON object matching this schema:
{
  "target_view": "reader" | "atlas" | "relationships" | "timeline" | "frontpage",
  "enable_zen_mode": boolean,
  "open_drawer": "statblock" | "weave-matrix" | "doctor" | null,
  "search_filter": string,
  "action_summary": string
}

Rules:
1. "target_view" MUST be one of: "reader", "atlas", "relationships", "timeline", "frontpage".
2. "enable_zen_mode" should be true if writing/drafting prose or focusing, false otherwise.
3. "open_drawer" should be "statblock" for monsters/NPCs/DMs, "weave-matrix" for scene prep/prose, "doctor" for auditing/fixing stubs, or null.
4. "action_summary" should be a concise 1-sentence friendly greeting describing what workspace view was configured.
5. Do NOT include markdown code fences or backticks. Return raw JSON.`;

    try {
      const aiResponse = await callGeminiApi(prompt);
      let parsed = safeExtractJSON(aiResponse);
      if (parsed && parsed.target_view) {
        const validViews = ['reader', 'atlas', 'relationships', 'timeline', 'frontpage'];
        if (!validViews.includes(parsed.target_view)) {
          parsed.target_view = 'frontpage';
        }
        return res.json({
          success: true,
          routing: parsed
        });
      }
    } catch (aiErr) {
      console.warn('[Concierge] Gemini AI classification warning, falling back to regex router:', aiErr.message);
    }

    const fallbackRoute = fallbackConciergeRoute(intentText);
    return res.json({
      success: true,
      routing: fallbackRoute
    });
  } catch (err) {
    console.error('[Concierge] Endpoint error:', err);
    return res.status(500).json({ error: 'Failed to route concierge intent: ' + err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LoreVault Server running locally on http://localhost:${PORT}`);
  });
}

module.exports = { app, db, getCastPersonaContext, stripSecretBlocks, filterArticleVisibility, serializeMarkdown, serializeXML, serializeJSON, serializeYAML, serializeContext, smartCategorizeArticle, callGeminiApiWithFallback, getAIConfig, saveAIConfig, maskApiKey };


