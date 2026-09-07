const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const {
  storageDir,
  syncFileToStorage,
  extractCrossLinks,
  parseMarkdownWithFrontmatter,
  filterArticleVisibility,
  stripSecretBlocks,
  serializeMarkdown,
  serializeXML,
  serializeJSON,
  serializeYAML,
  serializeContext
} = require('../helpers/markdown-helpers');

// GET /api/search/fts - SQLite FTS5 Full-Text Universal Search
router.get('/api/search/fts', (req, res) => {
  const { q, category, world_id, mode } = req.query;
  const isPlayerMode = mode === 'player';

  if (!q || !q.trim()) {
    return res.json({ query: '', total_results: 0, results: [] });
  }

  const cleanQ = q.trim().replace(/[^a-zA-Z0-9_\s]/g, '');
  if (!cleanQ) {
    return res.json({ query: q, total_results: 0, results: [] });
  }

  const ftsQuery = `${cleanQ}*`;

  db.all(
    `SELECT f.id, f.title, f.category, f.summary, f.tags, snippet(articles_fts, 4, '<mark>', '</mark>', '...', 15) as highlight_snippet
     FROM articles_fts f
     JOIN articles a ON f.id = a.id
     WHERE articles_fts MATCH ? AND (a.world_id = ? OR ? = 'all' OR a.world_id IS NULL)
     LIMIT 30`,
    [ftsQuery, world_id || 'all', world_id || 'all'],
    (err, rows) => {
      if (err) {
        db.all(
          `SELECT id, title, category, summary, tags FROM articles WHERE (title LIKE ? OR content LIKE ?) AND (world_id = ? OR ? = 'all') LIMIT 30`,
          [`%${cleanQ}%`, `%${cleanQ}%`, world_id || 'all', world_id || 'all'],
          (fallbackErr, fallbackRows) => {
            if (fallbackErr) return res.status(500).json({ error: fallbackErr.message });
            return res.json({ query: q, total_results: (fallbackRows || []).length, results: fallbackRows || [] });
          }
        );
        return;
      }

      const results = (rows || []).map(r => {
        const item = { ...r };
        if (isPlayerMode) {
          if (item.summary) item.summary = stripSecretBlocks(item.summary);
          if (item.highlight_snippet) item.highlight_snippet = stripSecretBlocks(item.highlight_snippet);
        }
        return item;
      });

      res.json({ query: q, total_results: results.length, results: results });
    }
  );
});

// GET /api/articles - List articles with filtering & stats
router.get('/api/articles', (req, res) => {
  const { category, search, world_id } = req.query;

  let query = 'SELECT id, title, category, sub_category, summary, tags, world_id, is_favorite, pin_to_sidebar, view_count, word_count, created_at, updated_at FROM articles WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR summary LIKE ? OR tags LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (world_id && world_id !== 'all') {
    query += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  query += ' ORDER BY title ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// GET /api/categories - Get category counts
router.get('/api/categories', (req, res) => {
  const { world_id } = req.query;
  let query = 'SELECT category, COUNT(*) as count FROM articles';
  const params = [];

  if (world_id && world_id !== 'all') {
    query += ' WHERE world_id = ? OR world_id IS NULL';
    params.push(world_id);
  }

  query += ' GROUP BY category';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const counts = {};
    (rows || []).forEach(r => counts[r.category] = r.count);
    res.json(counts);
  });
});

// GET /api/articles/:id - Get single article
router.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    db.run('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [id]);

    const sanitized = filterArticleVisibility(article, isPlayerMode);
    if (sanitized.tags) {
      try { sanitized.tags = JSON.parse(sanitized.tags); } catch (e) {}
    }

    res.json(sanitized);
  });
});

// POST /api/articles - Create new article
router.post('/api/articles', (req, res) => {
  const { title, category, summary, content, tags, world_id, header_image } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Title, category, and content are required' });
  }

  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `article-${Date.now()}`;
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(tags || []);

  const query = `
    INSERT INTO articles (id, title, category, summary, content, tags, world_id, header_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, title, category, summary || '', content, tagsJson, world_id || null, header_image || null, now, now], function (err) {
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

// PUT /api/articles/:id - Update article
router.put('/api/articles/:id', (req, res) => {
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
    extractCrossLinks(id, content);
    syncFileToStorage(id, content);
    res.json({ message: 'Article updated successfully' });
  });
});

// DELETE /api/articles/:id - Delete article
router.delete('/api/articles/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM articles WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const filePath = path.join(storageDir, `${id}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (e) => {
        if (e) console.error(`Failed to delete disk file ${id}.md:`, e);
      });
    }

    res.json({ message: 'Article deleted successfully' });
  });
});

// GET /api/articles/:id/history - List disk revision snapshots
router.get('/api/articles/:id/history', async (req, res) => {
  const articleId = req.params.id;
  const historyDir = path.join(storageDir, 'history', articleId);

  if (!fs.existsSync(historyDir)) {
    return res.json({ history: [] });
  }

  try {
    const files = await fs.promises.readdir(historyDir);
    const snapshots = [];

    for (const file of files) {
      if (file.endsWith('_rev.md')) {
        const timestamp = parseInt(file.split('_')[0]) || 0;
        const filePath = path.join(historyDir, file);
        const stats = await fs.promises.stat(filePath);
        const content = await fs.promises.readFile(filePath, 'utf8');

        snapshots.push({
          file: file,
          timestamp: timestamp,
          formatted_time: new Date(timestamp).toLocaleString(),
          size: stats.size,
          preview: content.substring(0, 150) + '...'
        });
      }
    }

    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    return res.json({ history: snapshots });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read revision history: ' + err.message });
  }
});

// POST /api/articles/:id/rollback - Rollback article to a revision snapshot
router.post('/api/articles/:id/rollback', async (req, res) => {
  const articleId = req.params.id;
  const { file } = req.body || {};

  if (!file) {
    return res.status(400).json({ error: 'Revision file name is required' });
  }

  const filePath = path.join(storageDir, 'history', articleId, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Revision file not found on disk' });
  }

  try {
    const rawContent = await fs.promises.readFile(filePath, 'utf8');
    const parsed = parseMarkdownWithFrontmatter(rawContent);

    const title = parsed.title || articleId;
    const category = parsed.category || 'General';
    const tags = Array.isArray(parsed.tags) ? parsed.tags.join(', ') : (parsed.tags || '');
    const bodyContent = parsed.content || '';

    const mainStoragePath = path.join(storageDir, `${articleId}.md`);

    // Reversible Rollback Guard: Save pre-rollback snapshot before overwriting
    if (fs.existsSync(mainStoragePath)) {
      const currentRaw = await fs.promises.readFile(mainStoragePath, 'utf8');
      const preRollbackFile = path.join(storageDir, 'history', articleId, `${Date.now()}_prerollback_rev.md`);
      await fs.promises.writeFile(preRollbackFile, currentRaw, 'utf8');
    }

    await fs.promises.writeFile(mainStoragePath, rawContent, 'utf8');

    db.run(
      'UPDATE articles SET title = ?, category = ?, tags = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, category, tags, bodyContent, articleId],
      function (dbErr) {
        if (dbErr) return res.status(500).json({ error: 'Database rollback failed: ' + dbErr.message });
        return res.json({ success: true, article_id: articleId, title, category, message: 'Article successfully restored from revision!' });
      }
    );
  } catch (err) {
    return res.status(500).json({ error: 'Failed to execute rollback: ' + err.message });
  }
});

// GET /api/articles/:id/statblock - Get statblock
router.get('/api/articles/:id/statblock', (req, res) => {
  const { id } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  db.get('SELECT * FROM article_statblocks WHERE article_id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Statblock not found' });

    if (row.actions_json) {
      try { row.actions_json = JSON.parse(row.actions_json); } catch (e) {}
    }

    if (isPlayerMode) {
      delete row.dm_secrets;
    }

    res.json(row);
  });
});

// POST /api/articles/:id/statblock - Upsert statblock
router.post('/api/articles/:id/statblock', (req, res) => {
  const { id } = req.params;
  const { armor_class, hit_points, speed, str, dex, con, int, wis, cha, challenge_rating, actions_json, player_secrets, dm_secrets } = req.body;

  const actionsStr = typeof actions_json === 'string' ? actions_json : JSON.stringify(actions_json || []);

  const query = `
    INSERT INTO article_statblocks (article_id, armor_class, hit_points, speed, str, dex, con, int, wis, cha, challenge_rating, actions_json, player_secrets, dm_secrets)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(article_id) DO UPDATE SET
      armor_class = excluded.armor_class,
      hit_points = excluded.hit_points,
      speed = excluded.speed,
      str = excluded.str,
      dex = excluded.dex,
      con = excluded.con,
      int = excluded.int,
      wis = excluded.wis,
      cha = excluded.cha,
      challenge_rating = excluded.challenge_rating,
      actions_json = excluded.actions_json,
      player_secrets = excluded.player_secrets,
      dm_secrets = excluded.dm_secrets,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(query, [id, armor_class || 10, hit_points || 10, speed || '30 ft.', str || 10, dex || 10, con || 10, int || 10, wis || 10, cha || 10, challenge_rating || '1/4', actionsStr, player_secrets || '', dm_secrets || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, article_id: id });
  });
});

module.exports = router;
