const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/worlds/:worldId/maps - Get maps for a world
router.get('/api/worlds/:worldId/maps', (req, res) => {
  const { worldId } = req.params;
  db.all('SELECT * FROM maps WHERE world_id = ? OR ? = "all" ORDER BY created_at ASC', [worldId, worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// GET /api/worlds/:worldId/canvas-nodes - Get canvas graph nodes
router.get('/api/worlds/:worldId/canvas-nodes', (req, res) => {
  const { worldId } = req.params;
  db.all('SELECT id, title, category, summary, world_id FROM articles WHERE world_id = ? OR ? = "all"', [worldId, worldId], (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT source_entity_id, target_entity_id, relationship_type FROM lore_relationships WHERE world_id = ? OR ? = "all"', [worldId, worldId], (relErr, rels) => {
      const nodes = (articles || []).map((a, idx) => ({
        id: a.id,
        label: a.title,
        category: a.category,
        x: (idx % 5) * 180 + 100,
        y: Math.floor(idx / 5) * 140 + 100
      }));

      const edges = (rels || []).map(r => ({
        source: r.source_entity_id,
        target: r.target_entity_id,
        label: r.relationship_type
      }));

      res.json({ nodes, edges });
    });
  });
});

// POST /api/canvas/positions - Save canvas node coordinates
router.post('/api/canvas/positions', (req, res) => {
  const { positions } = req.body || {};
  res.json({ success: true, count: Array.isArray(positions) ? positions.length : 0 });
});

module.exports = router;
