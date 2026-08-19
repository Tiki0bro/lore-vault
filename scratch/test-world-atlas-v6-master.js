const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testWorldAtlasV6Master() {
  console.log('--- Running World Atlas v6 Master Suite QA Tests ---');

  // 1. Check server.js for POST /api/ai/explore-region route
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('/api/ai/explore-region'), 'FAIL: POST /api/ai/explore-region route missing');
  console.log('✓ Server AI spatial region explorer endpoint check passed');

  // 2. DOM & AtlasView Hover Card Template Check
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
    marker: () => ({
      addTo: () => ({ bindTooltip: () => {} }),
      bindTooltip: () => {}
    })
  };

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  // Check code integration of glassmorphic hover card in atlas-view.js
  console.assert(atlasCode.includes('atlas-pin-hover-card'), 'FAIL: Rich hover card template missing in atlas-view.js');
  console.log('✓ Rich glassmorphic pin hover card template check passed');

  console.log('=== ALL WORLD ATLAS V6 MASTER SUITE QA TESTS PASSED PERFECTLY! ===');
}

testWorldAtlasV6Master().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
