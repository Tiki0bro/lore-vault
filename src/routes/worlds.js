const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/worlds - List all worlds
router.get('/api/worlds', (req, res) => {
  db.all('SELECT * FROM worlds ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/worlds - Create a new world
router.post('/api/worlds', (req, res) => {
  const { name, description, genre, theme, header_image } = req.body;
  if (!name) return res.status(400).json({ error: 'World name is required' });

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `world-${Date.now()}`;
  const now = new Date().toISOString();

  const query = `
    INSERT INTO worlds (id, name, description, genre, theme, header_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, name, description || '', genre || 'Fantasy', theme || 'ancient-codex', header_image || null, now, now], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, name, message: 'World created successfully' });
  });
});

// GET /api/worlds/:worldId/relationships - Relationship matrix
router.get('/api/worlds/:worldId/relationships', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  let query = 'SELECT * FROM lore_relationships WHERE (world_id = ? OR ? = "all")';
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY created_at DESC';

  db.all(query, [worldId, worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/worlds/:worldId/relationships - Create relationship
router.post('/api/worlds/:worldId/relationships', (req, res) => {
  const { worldId } = req.params;
  const { source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, sentiment_score, summary, is_secret } = req.body;

  if (!source_entity_id || !target_entity_id) {
    return res.status(400).json({ error: 'Source and Target entities are required' });
  }

  const query = `
    INSERT INTO lore_relationships (world_id, source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, sentiment_score, summary, is_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(world_id, source_entity_id, target_entity_id) DO UPDATE SET
      relationship_type = excluded.relationship_type,
      sentiment_score = excluded.sentiment_score,
      summary = excluded.summary,
      is_secret = excluded.is_secret,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(query, [worldId, source_entity_id, source_entity_title || source_entity_id, target_entity_id, target_entity_title || target_entity_id, relationship_type || 'neutral', sentiment_score || 0, summary || '', is_secret ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Relationship saved successfully' });
  });
});

// GET /api/worlds/:worldId/timeline - Get timeline events
router.get('/api/worlds/:worldId/timeline', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  let query = 'SELECT * FROM timeline_events WHERE (world_id = ? OR ? = "all")';
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY sort_order ASC, created_at ASC';

  db.all(query, [worldId, worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/worlds/:worldId/timeline - Create timeline event
router.post('/api/worlds/:worldId/timeline', (req, res) => {
  const { worldId } = req.params;
  const { title, display_year, epoch_name, sort_order, summary, content, category, is_secret, article_id } = req.body;

  if (!title || !display_year) {
    return res.status(400).json({ error: 'Title and Display Year are required' });
  }

  const id = `event-${Date.now()}`;
  const sortVal = parseFloat(sort_order) || parseFloat(display_year.replace(/[^0-9\.]/g, '')) || Date.now();

  const query = `
    INSERT INTO timeline_events (id, world_id, article_id, title, epoch_name, display_year, sort_order, summary, content, category, is_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, worldId, article_id || null, title, epoch_name || 'Common Era', display_year, sortVal, summary || '', content || '', category || 'Historical', is_secret ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, title, message: 'Timeline event created successfully' });
  });
});

// POST /api/export/world-bundle/:worldId - Offline world bundle export
router.post('/api/export/world-bundle/:worldId', (req, res) => {
  const { worldId } = req.params;
  const { format, is_player_mode } = req.body || {};

  db.all('SELECT * FROM articles WHERE world_id = ? OR ? = "all"', [worldId, worldId], (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });

    const bundle = {
      world_id: worldId,
      exported_at: new Date().toISOString(),
      format: format || 'json',
      total_articles: (articles || []).length,
      articles: articles || []
    };

    res.json(bundle);
  });
});

// POST /api/worlds/seed-demo - Seed sandbox demo world ('aethelgard')
router.post('/api/worlds/seed-demo', (req, res) => {
  const worldId = 'aethelgard';
  const worldName = 'The Shattered Realm of Aethelgard';
  const worldDesc = 'Starter sandbox world for exploring LoreVault features, @ cross-linking, maps, and relationship matrices.';

  db.serialize(() => {
    db.run(`INSERT OR IGNORE INTO worlds (id, name, description, theme) VALUES (?, ?, ?, 'ancient-codex')`, [worldId, worldName, worldDesc]);

    // Seed Demo Articles
    const art1 = ['art_aethelgard_1', 'High King Roderick', 'Characters', 'Noble Monarch', worldId, 'Ruler of Aethelgard and founder of the Order of the Dragon.', 'The High King of Aethelgard, who forged the dragon alliance during the Siege of the Sunken Citadel.'];
    const art2 = ['art_aethelgard_2', 'The Sunken Citadel', 'Locations', 'Ancient Fortress', worldId, 'Submerged fortress holding the Obsidian Relic.', 'An ancient fortress submerged in the mists, now home to forgotten relics and lost lore.'];
    const art3 = ['art_aethelgard_3', 'Order of the Dragon', 'Factions', 'Chivalric Order', worldId, 'Elite knightly order bound to High King Roderick.', 'An elite knightly order bound by oath to protect the crown and safeguard ancient dragon relics.'];

    db.run(`INSERT OR IGNORE INTO articles (id, title, category, sub_category, world_id, summary, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, art1);
    db.run(`INSERT OR IGNORE INTO articles (id, title, category, sub_category, world_id, summary, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, art2);
    db.run(`INSERT OR IGNORE INTO articles (id, title, category, sub_category, world_id, summary, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, art3);

    // Seed Demo Map & Pins
    db.run(`INSERT OR IGNORE INTO maps (id, title, image_path, world_id, description, scale_pixels, scale_distance, scale_unit) VALUES ('map_aethelgard_1', 'Aethelgard Realm Map', '/uploads/images/default-map.png', ?, 'The primary realm map of Aethelgard.', 100, 10, 'miles')`, [worldId]);
    db.run(`INSERT OR IGNORE INTO map_pins (id, map_id, article_id, category, label, x_pct, y_pct, pin_color, pin_icon) VALUES ('pin_aethelgard_1', 'map_aethelgard_1', 'art_aethelgard_2', 'location', 'The Sunken Citadel', 45.5, 32.0, '#38bdf8', '🏰')`);

    // Seed Demo Relationship
    db.run(`INSERT OR IGNORE INTO lore_relationships (world_id, source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, sentiment_score, summary, is_secret) VALUES (?, 'art_aethelgard_1', 'High King Roderick', 'art_aethelgard_3', 'Order of the Dragon', 'Sovereign & Patron', 8, 'High King Roderick commands the Order of the Dragon.', 0)`, [worldId]);

    res.json({
      success: true,
      world_id: worldId,
      name: worldName,
      message: 'Demo world Aethelgard seeded successfully'
    });
  });
});

module.exports = router;
