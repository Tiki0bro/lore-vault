const fs = require('fs');
const path = require('path');
const http = require('http');
const { JSDOM } = require('jsdom');
const { app, db } = require('../server');

console.log('=== Task 6: Offline HTML Atlas Exporter E2E Verification Suite ===\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}`);
    failed++;
  }
}

async function runTests() {
  const PORT = 3099;
  const server = app.listen(PORT);

  function requestExport(mode) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/export/atlas/default',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ mode }));
      req.end();
    });
  }

  try {
    const runRun = (sql, params) => new Promise((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 1. Seed Test Layers and Territories in DB
    const testMapId = `map-exp-${Date.now()}`;
    const testLayerPublicId = `layer-pub-${Date.now()}`;
    const testLayerSecretId = `layer-sec-${Date.now()}`;
    const testTerrPublicId = `terr-pub-${Date.now()}`;
    const testTerrContestedId = `terr-con-${Date.now()}`;
    const testTerrSecretId = `terr-sec-${Date.now()}`;

    await runRun('INSERT INTO maps (id, world_id, title, width, height, image_path) VALUES (?, ?, ?, ?, ?, ?)',
      [testMapId, 'default', 'Exporter Test Map', 1920, 1080, '/uploads/test.jpg']);

    await runRun('INSERT INTO map_layers (id, map_id, name, color_badge, is_visible, is_secret, sort_order) VALUES (?, ?, ?, ?, 1, 0, 0)',
      [testLayerPublicId, testMapId, 'Public Trade Routes', '#38bdf8']);
    await runRun('INSERT INTO map_layers (id, map_id, name, color_badge, is_visible, is_secret, sort_order) VALUES (?, ?, ?, ?, 1, 1, 1)',
      [testLayerSecretId, testMapId, 'Secret DM Underdark', '#a855f7']);

    await runRun(`INSERT INTO map_territories (id, map_id, layer_id, title, points_json, stroke_color, fill_color, is_contested, is_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [testTerrPublicId, testMapId, testLayerPublicId, 'Solaris Kingdom', JSON.stringify([[0.1, 0.1], [0.3, 0.1], [0.3, 0.3]]), '#38bdf8', '#38bdf8']);

    await runRun(`INSERT INTO map_territories (id, map_id, layer_id, title, points_json, stroke_color, fill_color, is_contested, is_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [testTerrContestedId, testMapId, testLayerPublicId, 'No Mans Land', JSON.stringify([[0.2, 0.2], [0.4, 0.2], [0.4, 0.4]]), '#ef4444', '#ef4444']);

    const testTerrSecretTitle = `Secret DM Shadow Abyss Territory ${Date.now()}`;

    await runRun(`INSERT INTO map_territories (id, map_id, layer_id, title, points_json, stroke_color, fill_color, is_contested, is_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [testTerrSecretId, testMapId, testLayerSecretId, testTerrSecretTitle, JSON.stringify([[0.5, 0.5], [0.7, 0.5], [0.7, 0.7]]), '#a855f7', '#a855f7']);

    // 2. Test DM Export Mode
    const dmRes = await requestExport('dm');
    assert(dmRes.status === 200, 'DM Export HTTP status is 200 OK');
    assert(dmRes.headers['content-type'].includes('text/html'), 'Export Content-Type is text/html');
    assert(dmRes.body.includes('<pattern id="pattern-stripe"'), 'Export HTML contains SVG cross-hatch pattern-stripe defs');
    assert(dmRes.body.includes('Solaris Kingdom'), 'DM Export HTML contains public territory');
    assert(dmRes.body.includes('No Mans Land'), 'DM Export HTML contains contested territory');
    assert(dmRes.body.includes(testTerrSecretTitle), 'DM Export HTML contains secret territory');
    assert(dmRes.body.includes('Secret DM Underdark'), 'DM Export HTML contains secret layer');

    // 3. Test Player Export Mode (Secret Filtering)
    const playerRes = await requestExport('player');
    assert(playerRes.status === 200, 'Player Export HTTP status is 200 OK');
    assert(playerRes.body.includes('Solaris Kingdom'), 'Player Export HTML contains public territory');
    assert(playerRes.body.includes('No Mans Land'), 'Player Export HTML contains contested territory');
    assert(!playerRes.body.includes(testTerrSecretTitle), 'Player Export HTML filters out secret territory');
    assert(!playerRes.body.includes('Secret DM Underdark'), 'Player Export HTML filters out secret layer');

    // 4. JSDOM Frontend Integration Test for exportStandaloneHtml()
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, { runScripts: "dangerously" });
    const window = dom.window;

    window.L = {
      CRS: { Simple: {} },
      map: () => ({ remove: () => {}, fitBounds: () => {}, on: () => {} }),
      imageOverlay: () => ({ addTo: () => {} })
    };

    let exportFetchCalled = false;
    let exportPayload = null;

    window.fetch = async (url, options = {}) => {
      if (url.includes('/api/worlds/default/maps')) return { ok: true, json: async () => ({ maps: [{ id: testMapId }] }) };
      if (url.includes('/api/articles')) return { ok: true, json: async () => [] };
      if (url.includes('/layers')) return { ok: true, json: async () => ({ layers: [] }) };
      if (url.includes('/pins')) return { ok: true, json: async () => ({ pins: [] }) };
      if (url.includes('/territories')) return { ok: true, json: async () => ({ territories: [] }) };
      if (url.includes('/api/export/atlas/')) {
        exportFetchCalled = true;
        exportPayload = JSON.parse(options.body);
        return {
          ok: true,
          blob: async () => new window.Blob(['<html></html>'], { type: 'text/html' })
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    window.URL.createObjectURL = () => 'blob:test';
    window.URL.revokeObjectURL = () => {};
    window.alert = () => {};

    const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
    window.eval(atlasCode);

    const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
    await atlas.init();
    await atlas.exportStandaloneHtml();

    assert(exportFetchCalled, 'exportStandaloneHtml() triggers fetch POST call to backend endpoint');
    assert(exportPayload && exportPayload.mode === 'dm', 'exportStandaloneHtml() passes current viewMode (dm)');
    assert(exportPayload && exportPayload.mapId === testMapId, 'exportStandaloneHtml() passes current mapId');

    dom.window.close();
  } finally {
    server.close();
  }

  console.log(`\n=== Task 6 Export Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
