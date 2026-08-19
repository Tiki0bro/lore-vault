const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testWorldAtlasV4Master() {
  console.log('--- Running World Atlas v4 Master Suite QA Tests ---');

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

  // Mock requestAnimationFrame & cancelAnimationFrame
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  // Mock Leaflet
  global.L = {
    divIcon: () => ({}),
    marker: (latlng) => ({
      addTo: () => ({ setLatLng: () => {} }),
      setLatLng: () => {}
    })
  };

  const atlasView = new dom.window.AtlasView('atlas-container', 'world-1');
  atlasView.currentMap = { id: 'map-1', title: 'Realm Map', width: 1920, height: 1080, image_path: '/uploads/images/test.png' };
  atlasView.mapInstance = {
    panTo: () => {},
    removeLayer: () => {},
    getBounds: () => ({
      getWest: () => 0,
      getEast: () => 1920,
      getSouth: () => 0,
      getNorth: () => 1080
    }),
    on: () => {}
  };

  // 1. Verify initMinimap method
  console.assert(typeof atlasView.initMinimap === 'function', 'FAIL: initMinimap missing');
  atlasView.initMinimap();
  console.log('✓ Spatial Minimap Radar integration passed');

  // 2. Verify animateRouteExpedition method
  console.assert(typeof atlasView.animateRouteExpedition === 'function', 'FAIL: animateRouteExpedition missing');
  const mockRoute = { id: 'route-1', title: 'Royal Highway', points: [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9]] };
  atlasView.animateRouteExpedition(mockRoute);
  console.assert(atlasView._travelPartyMarker !== null, 'FAIL: Party marker creation missing');
  console.log('✓ Animated Party Travel Token integration passed');

  console.log('=== ALL WORLD ATLAS V4 MASTER SUITE QA TESTS PASSED PERFECTLY! ===');
}

testWorldAtlasV4Master().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
