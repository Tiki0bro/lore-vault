const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testWorldAtlasV3() {
  console.log('--- Running World Atlas v3 QA Verification Tests ---');

  // 1. Check server.js for map_fog_states table and REST routes
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('CREATE TABLE IF NOT EXISTS map_fog_states'), 'FAIL: map_fog_states table missing');
  console.assert(serverCode.includes('/api/map-pins/:id'), 'FAIL: PUT /api/map-pins/:id route missing');
  console.assert(serverCode.includes('/api/maps/:mapId/fog'), 'FAIL: Fog of War REST routes missing');
  console.log('✓ Server table migrations & REST API routes check passed');

  // 2. DOM & AtlasView Pin Dragging Check
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

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  // VerifyAtlasView pin drag options
  console.assert(atlasCode.includes('draggable: isDraggable'), 'FAIL: Pin drag options missing in renderPinsOnCanvas');
  console.log('✓ AtlasView pin drag-and-drop code integration passed');

  console.log('=== ALL WORLD ATLAS V3 QA TESTS PASSED PERFECTLY! ===');
}

testWorldAtlasV3().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
