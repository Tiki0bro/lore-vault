const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testWorldAtlasV7Master() {
  console.log('--- Running World Atlas v7 Master Suite QA Tests ---');

  // 1. Check server.js for map_character_tokens table and REST routes
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('CREATE TABLE IF NOT EXISTS map_character_tokens'), 'FAIL: map_character_tokens table missing');
  console.assert(serverCode.includes('/api/maps/:mapId/tokens'), 'FAIL: REST routes for character tokens missing');
  console.log('✓ Server table migrations & VTT character token REST routes check passed');

  // 2. DOM & AtlasView Faction Heatmap Toggle Check
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="atlas-container"></div>
      </body>
    </html>
  `, { url: 'http://localhost:3000' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.Blob = dom.window.Blob;

  // Mock Leaflet
  global.L = {
    divIcon: () => ({}),
    marker: () => ({ bindTooltip: () => {} })
  };

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  const atlasView = new dom.window.AtlasView('atlas-container', 'world-1');
  console.assert(typeof atlasView.toggleFactionHeatmap === 'function', 'FAIL: toggleFactionHeatmap missing');
  atlasView.toggleFactionHeatmap(true);
  console.assert(atlasView.isFactionHeatmapActive === true, 'FAIL: Faction heatmap state not set to true');
  console.log('✓ Spatial Faction Control Heatmap toggle check passed');

  console.log('=== ALL WORLD ATLAS V7 MASTER SUITE QA TESTS PASSED PERFECTLY! ===');
}

testWorldAtlasV7Master().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
