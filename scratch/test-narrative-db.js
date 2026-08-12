const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'lore.db');
const db = new sqlite3.Database(dbPath);

const { getCastPersonaContext } = require('../server');

console.log('Testing Narrative Slate Database Migration & Persona Integration...');

db.serialize(() => {
  // 1. Create slates table
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
  `, (err) => {
    assert(!err, 'Failed to create slates table: ' + (err ? err.message : ''));
    console.log('✅ Slates table creation verified.');
  });

  // 2. Verify columns of slates table
  db.all(`PRAGMA table_info(slates)`, [], (err, rows) => {
    assert(!err, 'Failed to query slates table info');
    const columnNames = rows.map(r => r.name);
    const expectedColumns = [
      'id', 'name', 'world_id', 'plot_hook', 'scene_steps',
      'cast_ids', 'pinned_lore_ids', 'tone_chips', 'visibility',
      'format', 'max_tokens', 'created_at', 'updated_at'
    ];
    expectedColumns.forEach(col => {
      assert(columnNames.includes(col), `Column ${col} missing from slates table`);
    });
    console.log('✅ Slates table schema columns verified.');
  });

  // 3. Test insert & select from slates table
  const testSlateId = 'test-slate-' + Date.now();
  db.run(`
    INSERT INTO slates (id, name, world_id, plot_hook, scene_steps, cast_ids, pinned_lore_ids, tone_chips, visibility, format, max_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    testSlateId,
    'Test Slate',
    'world-1',
    'Test plot hook',
    JSON.stringify(['Step 1', 'Step 2']),
    JSON.stringify(['char-1', 'char-2']),
    JSON.stringify(['lore-1']),
    JSON.stringify(['Dark', 'Mystery']),
    'public',
    'markdown',
    4000
  ], (err) => {
    assert(!err, 'Failed to insert test slate record');
    
    db.get(`SELECT * FROM slates WHERE id = ?`, [testSlateId], (err, row) => {
      assert(!err, 'Failed to select inserted slate');
      assert.strictEqual(row.name, 'Test Slate');
      assert.strictEqual(row.world_id, 'world-1');
      console.log('✅ Slates insert & query test passed!');
      
      // Cleanup test row
      db.run(`DELETE FROM slates WHERE id = ?`, [testSlateId]);
    });
  });

  // 4. Test getCastPersonaContext helper
  const testArticleId = 'test-char-art-' + Date.now();
  const testPersonaId = 'test-per-' + Date.now();

  db.run(`
    INSERT INTO personas (id, article_id, thoughts, wants, needs, history_log)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [testPersonaId, testArticleId, 'Deep thoughts', 'Wants revenge', 'Needs redemption', 'Past history'], (err) => {
    assert(!err, 'Failed to insert test persona record');

    getCastPersonaContext([testArticleId], (err, personas) => {
      assert(!err, 'getCastPersonaContext returned error: ' + (err ? err.message : ''));
      assert(Array.isArray(personas), 'personas must be an array');
      assert.strictEqual(personas.length, 1, 'Expected 1 persona profile');
      assert.strictEqual(personas[0].article_id, testArticleId);
      assert.strictEqual(personas[0].wants, 'Wants revenge');
      assert.strictEqual(personas[0].needs, 'Needs redemption');
      assert.strictEqual(personas[0].thoughts, 'Deep thoughts');
      assert.strictEqual(personas[0].history_log, 'Past history');
      console.log('✅ getCastPersonaContext helper test passed!');

      // Cleanup test persona row
      db.run(`DELETE FROM personas WHERE id = ?`, [testPersonaId], () => {
        console.log('✅ Slates database migration test passed!');
        db.close();
      });
    });
  });
});
