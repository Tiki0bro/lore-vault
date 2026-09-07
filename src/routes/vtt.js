const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterArticleVisibility, stripSecretBlocks } = require('../helpers/markdown-helpers');

// GET /api/vtt/foundry/journals/:articleId - Foundry VTT Journal JSON Export
router.get('/api/vtt/foundry/journals/:articleId', (req, res) => {
  const { articleId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  db.get('SELECT * FROM articles WHERE id = ?', [articleId], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    db.get('SELECT * FROM article_statblocks WHERE article_id = ?', [articleId], (statErr, statblock) => {
      const sanitized = filterArticleVisibility(article, isPlayerMode);

      let contentHTML = `<h1>${sanitized.title}</h1><p><em>Category: ${sanitized.category}</em></p><p>${sanitized.summary || ''}</p><div>${(sanitized.content || '').replace(/\n/g, '<br/>')}</div>`;

      if (statblock) {
        contentHTML += `<hr/><h2>Statblock</h2><p><strong>AC:</strong> ${statblock.armor_class} | <strong>HP:</strong> ${statblock.hit_points} | <strong>Speed:</strong> ${statblock.speed}</p>`;
      }

      const foundryJSON = {
        name: sanitized.title,
        pages: [
          {
            name: sanitized.title,
            type: 'text',
            text: { content: contentHTML, format: 1 }
          }
        ],
        folder: null,
        sort: 0,
        ownership: { default: isPlayerMode ? 2 : 3 },
        flags: { lorevault: { article_id: articleId } }
      };

      res.json(foundryJSON);
    });
  });
});

// GET /api/vtt/foundry/scenes/:mapId - Foundry VTT Scene JSON Export
router.get('/api/vtt/foundry/scenes/:mapId', (req, res) => {
  const { mapId } = req.params;

  db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err, mapRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!mapRow) return res.status(404).json({ error: 'Map not found' });

    db.all('SELECT * FROM map_pins WHERE map_id = ?', [mapId], (pinErr, pins) => {
      const notes = (pins || []).map(p => ({
        x: Math.round((p.x_pct / 100) * (mapRow.width || 1920)),
        y: Math.round((p.y_pct / 100) * (mapRow.height || 1080)),
        text: p.label,
        icon: p.pin_icon || 'icons/svg/book.svg'
      }));

      const sceneJSON = {
        name: mapRow.title,
        img: mapRow.image_path,
        width: mapRow.width || 1920,
        height: mapRow.height || 1080,
        padding: 0,
        notes: notes,
        grid: { size: 100, distance: mapRow.scale_distance || 10, units: mapRow.scale_unit || 'miles' }
      };

      res.json(sceneJSON);
    });
  });
});

// POST /api/vtt/export/roll20 - Roll20 Handout Export
router.post('/api/vtt/export/roll20', (req, res) => {
  const { article_id, mode } = req.body || {};
  const isPlayerMode = mode === 'player';

  db.get('SELECT * FROM articles WHERE id = ?', [article_id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const sanitized = filterArticleVisibility(article, isPlayerMode);

    const roll20Handout = {
      name: sanitized.title,
      avatar: sanitized.header_image || '',
      notes: sanitized.content,
      gmnotes: isPlayerMode ? '*(Hidden in player mode)*' : `Summary: ${sanitized.summary || ''}`,
      inplayerjournals: isPlayerMode ? 'all' : ''
    };

    res.json({ success: true, platform: 'roll20', handout: roll20Handout });
  });
});

// POST /api/vtt/export/fgu - Fantasy Grounds Unity XML Export
router.post('/api/vtt/export/fgu', (req, res) => {
  const { article_id, mode } = req.body || {};
  const isPlayerMode = mode === 'player';

  db.get('SELECT * FROM articles WHERE id = ?', [article_id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const sanitized = filterArticleVisibility(article, isPlayerMode);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<root version="4.1">
  <journal>
    <category name="${sanitized.category}">
      <entry name="${sanitized.title}">
        <text type="formattedtext"><p>${sanitized.content}</p></text>
      </entry>
    </category>
  </journal>
</root>`;

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  });
});

// POST /api/vtt/validate-schema - VTT Schema Sanitizer & Validation
router.post('/api/vtt/validate-schema', (req, res) => {
  const { content, mode } = req.body || {};
  const isPlayerMode = mode === 'player';
  const sanitized = isPlayerMode ? stripSecretBlocks(content || '') : (content || '');
  res.json({ valid: true, mode: mode || 'dm', sanitized_content: sanitized });
});

module.exports = router;
