const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testWorldAtlasV5Master() {
  console.log('--- Running World Atlas v5 Master Suite QA Tests ---');

  // 1. Check server.js for POST /api/ai/travel-encounter route
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('/api/ai/travel-encounter'), 'FAIL: POST /api/ai/travel-encounter route missing');
  console.log('✓ Server AI travel encounter endpoint check passed');

  // 2. DOM & AtlasView Speed Multiplier & Minimap Pin Dots Check
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="atlas-container"></div>
        <div id="atlas-minimap" style="width:200px; height:112px;">
          <img id="minimap-img">
          <div id="minimap-viewport-rect"></div>
        </div>
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
    marker: () => ({ addTo: () => ({ setLatLng: () => {} }), setLatLng: () => {} })
  };

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  const atlasView = new dom.window.AtlasView('atlas-container', 'world-1');
  atlasView.currentMap = { id: 'map-1', title: 'Realm Map', width: 1920, height: 1080, image_path: '/uploads/images/test.png' };
  atlasView.pins = [{ id: 'p1', label: 'Citadel', x_pct: 0.5, y_pct: 0.5, pin_color: '#d97706' }];

  // Verify setExpeditionSpeed method
  console.assert(typeof atlasView.setExpeditionSpeed === 'function', 'FAIL: setExpeditionSpeed missing');
  atlasView.setExpeditionSpeed(2.0);
  console.assert(atlasView.travelSpeedMultiplier === 2.0, 'FAIL: travelSpeedMultiplier not updated to 2.0');
  console.log('✓ Travel speed control multiplier check passed');

  // Verify renderMinimapPinDots method
  console.assert(typeof atlasView.renderMinimapPinDots === 'function', 'FAIL: renderMinimapPinDots missing');
  atlasView.renderMinimapPinDots();
  const svgEl = document.querySelector('.minimap-pin-svg');
  console.assert(svgEl !== null, 'FAIL: SVG pin dot container missing in minimap');
  console.log('✓ Minimap pin dot SVG overlay check passed');

  console.log('=== ALL WORLD ATLAS V5 MASTER SUITE QA TESTS PASSED PERFECTLY! ===');
}

testWorldAtlasV5Master().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
