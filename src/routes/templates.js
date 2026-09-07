const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/templates - List custom category templates
router.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM lore_templates ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map(r => ({
      ...r,
      fields_json: typeof r.fields_json === 'string' ? JSON.parse(r.fields_json || '[]') : (r.fields_json || [])
    }));
    return res.json({ templates: formatted });
  });
});

// POST /api/templates - Create custom category template
router.post('/api/templates', (req, res) => {
  const { name, category, icon, fields_json, boilerplate_markdown } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and Category are required' });
  }

  const fieldsStr = typeof fields_json === 'string' ? fields_json : JSON.stringify(fields_json || []);
  const iconStr = icon || '📜';

  db.run(
    'INSERT INTO lore_templates (name, category, icon, fields_json, boilerplate_markdown) VALUES (?, ?, ?, ?, ?)',
    [name, category, iconStr, fieldsStr, boilerplate_markdown || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ success: true, id: this.lastID, name, category, icon: iconStr });
    }
  );
});

// GET /api/templates/export - Export custom category templates as JSON
router.get('/api/templates/export', (req, res) => {
  db.all('SELECT * FROM lore_templates', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ templates: rows || [] });
  });
});

// POST /api/templates/import - Import custom category templates from JSON bundle
router.post('/api/templates/import', (req, res) => {
  const { templates } = req.body || {};
  if (!Array.isArray(templates) || templates.length === 0) {
    return res.status(400).json({ error: 'Templates array is required' });
  }

  let imported = 0;
  const stmt = db.prepare('INSERT INTO lore_templates (name, category, icon, fields_json, boilerplate_markdown) VALUES (?, ?, ?, ?, ?)');

  templates.forEach(t => {
    if (t.name && t.category) {
      const fieldsStr = typeof t.fields_json === 'string' ? t.fields_json : JSON.stringify(t.fields_json || []);
      stmt.run(t.name, t.category, t.icon || '📜', fieldsStr, t.boilerplate_markdown || '');
      imported++;
    }
  });

  stmt.finalize();
  return res.json({ success: true, imported_count: imported });
});

// DELETE /api/templates/:id - Delete custom template
router.delete('/api/templates/:id', (req, res) => {
  db.run('DELETE FROM lore_templates WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;
