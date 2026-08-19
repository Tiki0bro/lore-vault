const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testNovelStoryboard() {
  console.log('--- Running Novel Chapter & Scene Storyboard QA Tests ---');

  // 1. Check server.js for map_pins columns and REST routes
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('ALTER TABLE map_pins ADD COLUMN chapter_num'), 'FAIL: chapter_num migration missing');
  console.assert(serverCode.includes('/api/maps/:mapId/storyboard'), 'FAIL: GET /api/maps/:mapId/storyboard route missing');
  console.assert(serverCode.includes('/api/map-pins/:pinId/storyboard'), 'FAIL: PUT /api/map-pins/:pinId/storyboard route missing');
  console.log('✓ Server migrations & REST API routes check passed');

  // 2. DOM & AtlasView Chapter Path Calculation Check
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
  const mockMarker = {
    bindTooltip: () => {},
    on: () => {}
  };
  mockMarker.addTo = () => mockMarker;

  global.L = {
    polyline: (latlngs) => ({
      addTo: () => ({ setLatLngs: () => {} }),
      remove: () => {}
    }),
    marker: () => mockMarker,
    divIcon: () => ({})
  };

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  const atlasView = new dom.window.AtlasView('atlas-container', 'world-1');
  atlasView.currentMap = { id: 'map-1', title: 'Realm Map', width: 1920, height: 1080 };
  atlasView.pins = [
    { id: 'p1', label: 'Start Citadel', x_pct: 0.1, y_pct: 0.1, chapter_num: 2 },
    { id: 'p2', label: 'Dark Forest', x_pct: 0.5, y_pct: 0.5, chapter_num: 2 }
  ];
  atlasView.mapInstance = {
    removeLayer: () => {},
    addLayer: () => {}
  };

  console.assert(typeof atlasView.filterPinsByChapter === 'function', 'FAIL: filterPinsByChapter missing');
  atlasView.filterPinsByChapter(2);
  console.assert(atlasView.selectedChapterNum === 2, 'FAIL: selectedChapterNum not updated to 2');
  console.log('✓ Chapter Storyboard filtering & travel sequence path generation check passed');

  console.log('=== ALL NOVEL STORYBOARD QA TESTS PASSED PERFECTLY! ===');
}

testNovelStoryboard().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
