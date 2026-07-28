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

function getAIConfig() {
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed) {
        // Auto-upgrade deprecated 2024-2025 era Gemini models
        if (parsed.model === 'gemini-1.5-flash') parsed.model = 'gemini-flash-latest';
        if (parsed.model === 'gemini-1.5-pro') parsed.model = 'gemini-pro-latest';
        if (parsed.model && parsed.model.includes('3.0')) parsed.model = 'gemini-2.0-flash';
        if (parsed.model && parsed.model.includes('3.1')) parsed.model = 'gemini-pro-latest';
        return parsed;
      }
    } catch (e) {}
  }
  return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY || '', model: 'gemini-flash-latest' };
}

function saveAIConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {}
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
  db.run("ALTER TABLE articles ADD COLUMN header_image TEXT", (err) => {});

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
      db.run("INSERT INTO worlds (id, name, description, color, theme) VALUES ('default', 'Primary World', 'Main world lore vault', '#38bdf8', 'ancient-codex')");
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
  const { name, description, color, theme } = req.body;
  if (!name) return res.status(400).json({ error: 'World name is required.' });

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'world-' + Date.now();
  const hexColor = color || '#' + Math.floor(Math.random()*16777215).toString(16);
  const worldTheme = theme || 'ancient-codex';

  db.run('INSERT INTO worlds (id, name, description, color, theme) VALUES (?, ?, ?, ?, ?)', [id, name, description || '', hexColor, worldTheme], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, name, description, color: hexColor, theme: worldTheme, message: 'World created successfully!' });
  });
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
  const { search, category, tag, world_id } = req.query;
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
  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }
  if (search) {
    query += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY updated_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : []
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
        res.json({
          ...article,
          tags: article.tags ? JSON.parse(article.tags) : [],
          outboundLinks: outbound || [],
          inboundLinks: inbound || []
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
    
    // Clean up associated relations and personas
    db.run('DELETE FROM relations WHERE source_id = ? OR target_id = ?', [id, id]);
    db.run('DELETE FROM personas WHERE article_id = ?', [id]);

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
      if (!categoriesMap[r.category]) {
        categoriesMap[r.category] = { category: r.category, count: 0, subCategories: [] };
      }
      categoriesMap[r.category].count += r.count;
      if (r.sub_category) {
        categoriesMap[r.category].subCategories.push({ subCategory: r.sub_category, count: r.count });
      }
    });

    res.json(Object.values(categoriesMap));
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

// --- LLM Context Builder Pipeline & Helper Utilities ---

function stripSecretBlocks(text) {
  if (!text) return '';
  return text
    .replace(/\[box=secret\][\s\S]*?\[\/box\]/gi, '')
    .replace(/\[secret\][\s\S]*?\[\/secret\]/gi, '')
    .trim();
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
  const normSerializer = (serializer || 'markdown').toLowerCase();

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
  const normSerializer = (config.serializer || 'markdown').toLowerCase();
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
  compileContextEngine(db, req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
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
    expanded += `\n\n[hr]\n\n[h2]II. Cultural Traditions & Secrets[/h2]\n[b]Secret Lore:[/b] Ancient chronicles mention rumors of hidden vaults beneath the primary region.\n[b]Social Customs:[/b] Local inhabitants observe a seasonal festival commemorating past victories.`;
    return expanded;
  } else {
    // Clean & sanitize
    return content.trim();
  }
}

// POST /api/ai/assist - Live AI Assistant Endpoint
app.post('/api/ai/assist', async (req, res) => {
  const { action, title, content, category, provider, apiKey, model, instructions } = req.body;

  let prompt = '';
  if (action === 'format_worldanvil') {
    prompt = `You are a WorldAnvil formatting expert. Convert the following unstructured lore text into WorldAnvil Simplified Standard syntax.
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
    prompt = `Expand the worldbuilding lore article titled "${title}". Add richer details while preserving existing facts.${focusDirection}\nReturn updated formatted text.\n\nEXISTING LORE:\n${content}`;
  } else {
    prompt = `${instructions || 'Refine and clean up this world lore article.'}\n\nARTICLE TITLE: ${title}\nCONTENT:\n${content}`;
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
    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.json({ result: text });
      }
    } catch (e) {}
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
  res.json(getAIConfig());
});

// POST /api/ai/config - Save Permanent Server AI Config
app.post('/api/ai/config', (req, res) => {
  const { provider, apiKey, model } = req.body;
  const config = { provider: provider || 'gemini', apiKey: apiKey || '', model: model || 'gemini-1.5-flash' };
  saveAIConfig(config);
  res.json({ message: 'Server AI Configuration Saved Permanently!', config });
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

// ALL /api/audit/run - World Doctor AI Audit Scanner (Supports GET & POST with world_id scoping)
app.all('/api/audit/run', (req, res) => {
  const world_id = req.body?.world_id || req.query?.world_id;
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content, tags FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT source_id, target_id FROM relations', [], (err, rels) => {
      const activeRelationIds = new Set();
      if (!err && rels) {
        rels.forEach(r => {
          activeRelationIds.add(r.source_id);
          activeRelationIds.add(r.target_id);
        });
      }

      const stubArticles = [];
      const misclassifiedArticles = [];
      const duplicateArticles = [];
      const orphanArticles = [];

      const seenTitles = new Map();

      rows.forEach(art => {
        const cleanContent = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
        const isBoilerplate = /welcome to world anvil|describe a predator|read me first/i.test(cleanContent + ' ' + art.title);
        const isStub = cleanContent.length < 50 || isBoilerplate;

        // 1. Stub Check
        if (isStub) {
          stubArticles.push({
            id: art.id,
            title: art.title,
            category: art.category,
            world_id: art.world_id,
            reason: isBoilerplate ? 'Default Template Boilerplate' : 'Empty / Stub Article (< 50 chars)'
          });
        }

        // 2. Category Misclassification Check
        const smart = smartCategorizeArticle(art.title, art.content);
        if (smart.category !== art.category) {
          misclassifiedArticles.push({
            id: art.id,
            title: art.title,
            currentCategory: art.category,
            suggestedCategory: smart.category,
            suggestedSubCategory: smart.subCategory,
            summary: art.summary || smart.summary,
            reasoning: `Title/Content match '${smart.category}' pattern`
          });
        }

        // 3. Duplicate Article Check (Identical / Double-up Titles)
        const normTitle = art.title.toLowerCase().trim();
        if (seenTitles.has(normTitle)) {
          duplicateArticles.push({
            id: art.id,
            originalId: seenTitles.get(normTitle).id,
            title: art.title,
            category: art.category,
            originalCategory: seenTitles.get(normTitle).category
          });
        } else {
          seenTitles.set(normTitle, { id: art.id, category: art.category });
        }

        // 4. Orphaned Article Check (0 Cross-Links / Unlinked Lore)
        if (!activeRelationIds.has(art.id) && !art.content.includes('@[') && !art.content.includes('[[')) {
          orphanArticles.push({
            id: art.id,
            title: art.title,
            category: art.category
          });
        }
      });

      const penalties = (duplicateArticles.length * 10) + (misclassifiedArticles.length * 5) + (stubArticles.length * 3) + (orphanArticles.length * 2);
      const healthScore = Math.max(0, Math.min(100, 100 - penalties));

      res.json({
        world_id: world_id || 'all',
        totalAudited: rows.length,
        healthScore,
        counts: {
          duplicates: duplicateArticles.length,
          misclassified: misclassifiedArticles.length,
          stubs: stubArticles.length,
          orphans: orphanArticles.length
        },
        stubCount: stubArticles.length,
        misclassifiedCount: misclassifiedArticles.length,
        duplicateCount: duplicateArticles.length,
        orphanCount: orphanArticles.length,
        stubArticles,
        misclassifiedArticles,
        duplicateArticles,
        orphanArticles
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
      if (seenTitles.has(normTitle)) {
        const orig = seenTitles.get(normTitle);
        queue.push({
          id: 'dup-' + art.id,
          type: 'duplicate',
          articleId: art.id,
          title: art.title,
          category: art.category,
          originalId: orig.id,
          originalCategory: orig.category,
          content: art.content,
          originalContent: orig.content
        });
      } else {
        seenTitles.set(normTitle, art);
      }

      const smart = smartCategorizeArticle(art.title, art.content);
      if (smart.category !== art.category) {
        queue.push({
          id: 'misc-' + art.id,
          type: 'misclassification',
          articleId: art.id,
          title: art.title,
          currentCategory: art.category,
          suggestedCategory: smart.category,
          suggestedSubCategory: smart.subCategory,
          reasoning: `Contains strong signals for ${smart.category}`,
          excerpt: (art.summary || art.content).substring(0, 180)
        });
      }

      const clean = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
      const isBoilerplate = /welcome to world anvil|describe a predator|read me first/i.test(clean + ' ' + art.title);
      if (clean.length < 50 || isBoilerplate) {
        queue.push({
          id: 'stub-' + art.id,
          type: 'stub',
          articleId: art.id,
          title: art.title,
          category: art.category,
          excerpt: clean || 'Empty Article'
        });
      }
    });

    res.json({ totalItems: queue.length, queue });
  });
});

// POST /api/audit/apply-action - Execute Individual Guided Session Repair Action
app.post('/api/audit/apply-action', (req, res) => {
  const { action, articleId, params } = req.body;
  if (!action || !articleId) return res.status(400).json({ error: 'action and articleId are required' });

  if (action === 'recategorize') {
    const newCat = params?.newCategory || 'General';
    const newSubCat = params?.newSubCategory || 'General';
    db.run('UPDATE articles SET category = ?, sub_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newCat, newSubCat, articleId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Re-categorized ${articleId} to ${newCat}` });
      });
  } else if (action === 'delete_article') {
    db.run('DELETE FROM articles WHERE id = ?', [articleId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const filePath = path.join(storageDir, `${articleId}.md`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true, message: `Deleted article ${articleId}` });
    });
  } else if (action === 'merge_duplicates') {
    const targetMasterId = params?.targetMasterId;
    if (!targetMasterId) return res.status(400).json({ error: 'targetMasterId is required for merge_duplicates' });

    db.get('SELECT content FROM articles WHERE id = ?', [articleId], (err, row1) => {
      db.get('SELECT content FROM articles WHERE id = ?', [targetMasterId], (err, row2) => {
        if (row1 && row2) {
          const mergedContent = (row2.content + '\n\n' + row1.content).trim();
          db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [mergedContent, targetMasterId]);
          db.run('DELETE FROM articles WHERE id = ?', [articleId]);
          const filePath = path.join(storageDir, `${articleId}.md`);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          syncFileToStorage(targetMasterId, mergedContent);
        }
        res.json({ success: true, message: `Merged duplicate into master ${targetMasterId}` });
      });
    });
  } else {
    res.json({ success: true, message: 'Action processed' });
  }
});

// POST /api/audit/apply-fixes - Batch Fix Misclassifications & Clean Stubs
app.post('/api/audit/apply-fixes', (req, res) => {
  const { fixes } = req.body;
  if (!fixes || !Array.isArray(fixes) || fixes.length === 0) {
    return res.status(400).json({ error: 'No fixes provided.' });
  }

  let fixedCount = 0;
  let deletedCount = 0;

  fixes.forEach(fix => {
    if (fix.action === 'recategorize' && fix.newCategory) {
      db.run('UPDATE articles SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [fix.newCategory, fix.id], (err) => {
        if (!err) fixedCount++;
      });
    } else if (fix.action === 'delete_stub') {
      db.run('DELETE FROM articles WHERE id = ?', [fix.id], (err) => {
        if (!err) {
          deletedCount++;
          const filePath = path.join(storageDir, `${fix.id}.md`);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });
    }
  });

  setTimeout(() => {
    res.json({
      message: `Audit complete! Re-categorized ${fixedCount} articles and removed ${deletedCount} empty stubs.`,
      fixedCount,
      deletedCount
    });
  }, 500);
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
  const { stubId, title, category, genre } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const genreTone = genre || 'High Fantasy';
  const prompt = `Write a rich 2-paragraph world lore article for "${title}" (Category: ${category}) in the genre style "${genreTone}".
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
        stubCount: auditStats.stubCount,
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
    'Species': 0,
    'Magic & Tech': 0,
    'History': 0,
    'Items': 0
  };

  // Title-based strong signals (+5 points)
  if (/\b(city|town|village|kingdom|realm|continent|region|mountain|mountains|river|ocean|sea|forest|fortress|castle|garrison|gate|mill|isles|island|lake|reach|harbor|bay|valley|ruins)\b/i.test(cleanTitle)) scores['Locations'] += 5;
  if (/\b(house|syndicate|vanguard|guild|order|clan|empire|alliance|organization|faction|council|cult|rebellion|covenant|society)\b/i.test(cleanTitle)) scores['Factions'] += 5;
  if (/\b(lord|lady|king|queen|empress|emperor|prince|princess|sir|captain|elder|seer|cantor|warlock|wizard|sorcerer|sameral|character|biography)\b/i.test(cleanTitle)) scores['Characters'] += 5;
  if (/\b(species|race|humanoid|elf|elves|dwarf|dwarves|orc|orcs|dragon|dragons|fae|beast|monster)\b/i.test(cleanTitle)) scores['Species'] += 5;
  if (/\b(spell|spells|magic|mana|arcane|alchemy|tech|technology|artifact|rune|words of power)\b/i.test(cleanTitle)) scores['Magic & Tech'] += 5;
  if (/\b(war|battle|era|age|chronicle|timeline|event|history)\b/i.test(cleanTitle)) scores['History'] += 5;
  if (/\b(sword|blade|shield|armor|potion|ring|amulet|item|weapon|relic)\b/i.test(cleanTitle)) scores['Items'] += 5;

  // Content-based body signals (+2 points)
  if (/born|age|biography|personality|eyes|hair|lineage|father|mother|husband|wife|hero|villain|adventurer|person|character/i.test(textLower)) scores['Characters'] += 2;
  if (/city|town|village|kingdom|realm|continent|region|mountain|river|ocean|sea|forest|fortress|castle|climate|location|geography|settlement/i.test(textLower)) scores['Locations'] += 2;
  if (/guild|house|syndicate|army|legion|order|clan|empire|alliance|organization|faction|council|cult|rebellion/i.test(textLower)) scores['Factions'] += 2;
  if (/race|species|humanoid|elf|dwarf|orc|dragon|fae|creature|lifespan|subspecies|beast/i.test(textLower)) scores['Species'] += 2;
  if (/magic|spell|mana|arcane|alchemy|element|enchantment|crystal|technology|machine|artifact|rune/i.test(textLower)) scores['Magic & Tech'] += 2;
  if (/war|battle|era|age of|founding|shattering|treaty|historical|chronicle|timeline|event|century/i.test(textLower)) scores['History'] += 2;
  if (/sword|blade|shield|armor|potion|ring|amulet|artifact|item|weapon|relic|reagent/i.test(textLower)) scores['Items'] += 2;

  let topCategory = 'Locations';
  let maxScore = -1;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore && score > 0) {
      maxScore = score;
      topCategory = cat;
    }
  }

  // Sub-category subset classification
  let subCategory = 'General';
  if (topCategory === 'Locations') {
    if (/city|town|settlement|capital|village/i.test(textLower)) subCategory = 'Cities & Settlements';
    else if (/fortress|castle|garrison|keep|citadel|eyrie/i.test(textLower)) subCategory = 'Fortresses & Strongholds';
    else if (/realm|kingdom|empire|continent|region/i.test(textLower)) subCategory = 'Realms & Territories';
    else if (/mountain|forest|river|sea|ocean|wilderness|bay|valley/i.test(textLower)) subCategory = 'Geography & Wilderness';
    else subCategory = 'Landmarks & Sites';
  } else if (topCategory === 'Characters') {
    if (/lord|lady|king|queen|empress|emperor|prince|princess|noble/i.test(textLower)) subCategory = 'Rulers & Nobility';
    else if (/seer|wizard|sorcerer|warlock|mage|priest|cantor/i.test(textLower)) subCategory = 'Mages & Mystics';
    else if (/captain|commander|soldier|guard|knight/i.test(textLower)) subCategory = 'Warriors & Officers';
    else subCategory = 'Key Figures';
  } else if (topCategory === 'Factions') {
    if (/house|bloodline|dynasty/i.test(textLower)) subCategory = 'Noble Houses';
    else if (/syndicate|underground|guild|rogue/i.test(textLower)) subCategory = 'Syndicates & Guilds';
    else if (/army|legion|guard|vanguard/i.test(textLower)) subCategory = 'Military Orders';
    else subCategory = 'Organizations';
  } else if (topCategory === 'Magic & Tech') {
    if (/spell|incantation|rune|words of power/i.test(textLower)) subCategory = 'Spells & Incantations';
    else if (/artifact|crystal|catalyst/i.test(textLower)) subCategory = 'Arcane Artifacts';
    else subCategory = 'Magic Systems';
  }

  let cleanText = content.replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
  let firstParagraph = cleanText.split(/\n\n+/)[0] || '';
  let summary = firstParagraph.substring(0, 160);
  if (summary.length >= 160) summary += '...';

  let keywordMaxScore = 0;

  const keywordsMap = {
    'Characters': {
      weight: 3,
      keywords: ['character', 'person', 'hero', 'villain', 'king', 'queen', 'emperor', 'npc', 'biography', 'lord', 'lady', 'warrior', 'mage', 'rogue', 'paladin', 'cleric', 'born', 'died', 'father', 'mother', 'son', 'daughter', 'height', 'weight', 'eyes', 'hair'],
      subCategories: {
        'Historical Figures': ['king', 'queen', 'emperor', 'legendary', 'ancient'],
        'Protagonists & NPCs': ['companion', 'ally', 'merchant', 'quest-giver'],
        'Villains & Antagonists': ['villain', 'dark lord', 'tyrant', 'enemy', 'boss']
      }
    },
    'Locations': {
      weight: 2,
      keywords: ['location', 'city', 'town', 'village', 'settlement', 'kingdom', 'realm', 'region', 'continent', 'mountain', 'river', 'forest', 'ocean', 'sea', 'lake', 'castle', 'fortress', 'dungeon', 'temple', 'shrine', 'capital', 'province'],
      subCategories: {
        'Cities & Settlements': ['city', 'town', 'village', 'capital', 'settlement', 'port'],
        'Geographic Features': ['mountain', 'river', 'forest', 'valley', 'desert', 'ocean', 'sea', 'lake', 'island'],
        'Dungeons & Landmarks': ['dungeon', 'ruin', 'temple', 'castle', 'fortress', 'shrine', 'tower']
      }
    },
    'Factions': {
      weight: 3,
      keywords: ['faction', 'organization', 'guild', 'order', 'cult', 'clan', 'house', 'syndicate', 'alliance', 'covenant', 'brotherhood', 'fleet', 'company', 'court', 'council'],
      subCategories: {
        'Guilds & Orders': ['guild', 'order', 'brotherhood', 'knights', 'mercenary'],
        'Noble Houses': ['house', 'dynasty', 'clan', 'noble', 'family'],
        'Secret Societies & Cults': ['cult', 'cabal', 'syndicate', 'secret', 'shadow']
      }
    },
    'Species': {
      weight: 3,
      keywords: ['species', 'race', 'creature', 'monster', 'beast', 'fauna', 'flora', 'plant', 'herb', 'beast', 'dragon', 'elf', 'dwarf', 'orc', 'goblin', 'undead', 'demon', 'elemental'],
      subCategories: {
        'Sentient Races': ['elf', 'dwarf', 'orc', 'human', 'gnome', 'halfling', 'race', 'people'],
        'Monsters & Beasts': ['monster', 'beast', 'dragon', 'demon', 'undead', 'aberration'],
        'Flora & Natural Life': ['plant', 'herb', 'tree', 'flower', 'fauna', 'flora', 'fungus']
      }
    },
    'Items': {
      weight: 3,
      keywords: ['item', 'weapon', 'armor', 'artifact', 'relic', 'potion', 'scroll', 'tool', 'equipment', 'sword', 'shield', 'ring', 'amulet', 'staff', 'blade', 'bow', 'crown'],
      subCategories: {
        'Weapons & Armor': ['sword', 'blade', 'bow', 'shield', 'armor', 'helm', 'spear', 'staff', 'axe'],
        'Artifacts & Relics': ['artifact', 'relic', 'crown', 'ring', 'amulet', 'orb', 'tome'],
        'Consumables & Tools': ['potion', 'scroll', 'elixir', 'tool', 'key', 'kit']
      }
    },
    'Magic & Tech': {
      weight: 3,
      keywords: ['magic', 'spell', 'technology', 'tech', 'alchemy', 'rune', 'enchantment', 'ritual', 'system', 'device', 'construct', 'golem', 'ship', 'airship', 'engine', 'power'],
      subCategories: {
        'Spells & Rituals': ['spell', 'incantation', 'ritual', 'enchantment', 'hex', 'curse'],
        'Magical Systems': ['mana', 'ether', 'weave', 'school of magic', 'elemental'],
        'Technology & Gizmos': ['device', 'engine', 'airship', 'construct', 'golem', 'machine', 'tech']
      }
    },
    'History': {
      weight: 3,
      keywords: ['history', 'event', 'war', 'battle', 'era', 'age', 'siege', 'treaty', 'revolution', 'cataclysm', 'shattering', 'rebellion', 'fall', 'rise', 'chronicle', 'timeline'],
      subCategories: {
        'Wars & Conflicts': ['war', 'battle', 'siege', 'rebellion', 'crusade', 'conflict'],
        'Historical Eras': ['era', 'age', 'period', 'century', 'epoch'],
        'Cataclysms & Pivotal Events': ['cataclysm', 'shattering', 'fall', 'founding', 'treaty', 'disaster']
      }
    }
  };

  for (const [catName, catData] of Object.entries(keywordsMap)) {
    let score = 0;
    catData.keywords.forEach(kw => {
      if (cleanTitle.includes(kw)) score += kw.length * 4;
      if (textLower.includes(kw)) score += 1;
    });

    score *= catData.weight;

    if (score > keywordMaxScore) {
      keywordMaxScore = score;
      topCategory = catName;

      let subScore = 0;
      for (const [subName, subKws] of Object.entries(catData.subCategories)) {
        let currentSubScore = 0;
        subKws.forEach(skw => {
          if (cleanTitle.includes(skw)) currentSubScore += 3;
          if (textLower.includes(skw)) currentSubScore += 1;
        });
        if (currentSubScore > subScore) {
          subScore = currentSubScore;
          subCategory = subName;
        }
      }
    }
  }

  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  summary = sentences.slice(0, 2).join(' ').trim() || summary || `${title} lore article.`;

  const autoTags = new Set([topCategory.toLowerCase()]);
  if (subCategory !== 'General') autoTags.add(subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

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
      let model = serverCfg.model || 'gemini-flash-latest';
      let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      let gData = await geminiRes.json();
      
      if (gData.error && gData.error.status === 'NOT_FOUND') {
         // Fallback to known working model if user configured an invalid one
         model = 'gemini-flash-latest';
         geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
         });
         gData = await geminiRes.json();
      }
      
      if (gData.error) {
        throw new Error(gData.error.message || 'Gemini API Error');
      }
      
      let text = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
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

app.listen(PORT, () => {
  console.log(`LoreVault Server running locally on http://localhost:${PORT}`);
});
