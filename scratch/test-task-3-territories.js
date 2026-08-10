const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
  runScripts: "dangerously"
});
const window = dom.window;

// Mock Leaflet
class MockPolyline {
  constructor(latlngs, options) {
    this.latlngs = latlngs;
    this.options = options;
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  setLatLngs(latlngs) { this.latlngs = latlngs; }
}

class MockPolygon {
  constructor(latlngs, options) {
    this.latlngs = latlngs;
    this.options = options;
    this.events = {};
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  bindTooltip() { return this; }
  setLatLngs(latlngs) { this.latlngs = latlngs; }
  on(event, handler) { this.events[event] = handler; return this; }
}

class MockMarker {
  constructor(latlng, options) {
    this.latlng = latlng;
    this.options = options;
    this.events = {};
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  bindTooltip() { return this; }
  on(event, handler) { this.events[event] = handler; return this; }
  getLatLng() { return { lat: this.latlng[0], lng: this.latlng[1] }; }
  setLatLng(latlng) { this.latlng = latlng; }
}

window.L = {
  CRS: { Simple: {} },
  map: () => ({
    remove: () => {},
    fitBounds: () => {},
    on: (event, handler) => { mapClickHandlers[event] = handler; }
  }),
  imageOverlay: () => ({
    addTo: () => {}
  }),
  polyline: (latlngs, options) => new MockPolyline(latlngs, options),
  polygon: (latlngs, options) => new MockPolygon(latlngs, options),
  marker: (latlng, options) => new MockMarker(latlng, options),
  divIcon: (opts) => opts,
  DomEvent: { stopPropagation: () => {} }
};

const mapClickHandlers = {};

const mockMaps = [{ id: 'map-1', title: 'Aethelgard World Map', width: 1000, height: 500, image_path: '/uploads/map.jpg' }];
const mockLayers = [
  { id: 'layer-1', map_id: 'map-1', name: 'Political Boundaries', color_badge: '#ef4444', is_visible: 1, is_secret: 0, sort_order: 0 },
  { id: 'layer-2', map_id: 'map-1', name: 'DM Hidden Ruins', color_badge: '#a855f7', is_visible: 1, is_secret: 1, sort_order: 1 }
];

let createdTerritories = [];

window.fetch = (url, options = {}) => {
  const method = options.method || 'GET';
  
  if (url.includes('/api/worlds/default/maps')) return Promise.resolve({ json: () => Promise.resolve({ maps: mockMaps }) });
  if (url.includes('/api/articles')) return Promise.resolve({ json: () => Promise.resolve([]) });
  if (url.includes('/layers')) return Promise.resolve({ json: () => Promise.resolve({ layers: mockLayers }) });
  if (url.includes('/pins')) return Promise.resolve({ json: () => Promise.resolve({ pins: [] }) });
  if (url.includes('/territories')) {
    if (method === 'GET') {
      return Promise.resolve({ json: () => Promise.resolve({ territories: createdTerritories }) });
    }
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const newTerritory = { id: `terr-${Date.now()}`, map_id: 'map-1', ...body };
      createdTerritories.push(newTerritory);
      return Promise.resolve({ json: () => Promise.resolve({ success: true, territory: newTerritory }) });
    }
    if (method === 'PUT') {
      const body = JSON.parse(options.body);
      const terrId = url.split('/').pop();
      const terr = createdTerritories.find(t => t.id === terrId);
      if (terr) Object.assign(terr, body);
      return Promise.resolve({ json: () => Promise.resolve({ success: true, territory: terr || body }) });
    }
    if (method === 'DELETE') {
      const terrId = url.split('/').pop();
      createdTerritories = createdTerritories.filter(t => t.id !== terrId);
      return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
    }
  }
  return Promise.resolve({ json: () => Promise.resolve({}) });
};

window.confirm = () => true;
window.alert = () => {};

const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
window.eval(atlasCode);

async function test() {
  console.log('Testing AtlasView Territory Vector Drawing & Vertex Handles...');

  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  // 1. Check UI elements rendering
  const territoryBtn = window.document.getElementById('atlas-territory-mode-btn');
  const territoryToast = window.document.getElementById('atlas-territory-toast');
  const territoryModal = window.document.getElementById('atlas-territory-modal');

  console.assert(!!territoryBtn, 'Territory toolbar button should be present');
  console.assert(!!territoryToast, 'Territory drawing toast should be present');
  console.assert(!!territoryModal, 'Territory modal should be present');

  // 2. Test activating territory drawing mode
  atlas.toggleTerritoryDrawingMode(true);
  console.assert(atlas.isTerritoryDrawingActive === true, 'Territory drawing mode should be active');
  console.assert(territoryToast.style.display !== 'none', 'Drawing toast should be visible');

  // 3. Simulate map clicks (adding 3 vertices in normalized percentage floats)
  // Map dimensions: width 1000, height 500
  atlas.addTerritoryDrawingVertex(0.1, 0.2); // [100, 100] in latlng
  atlas.addTerritoryDrawingVertex(0.4, 0.2); // [400, 100] in latlng
  atlas.addTerritoryDrawingVertex(0.4, 0.8); // [400, 400] in latlng

  console.assert(atlas.activeDrawVertices.length === 3, `Expected 3 vertices, got ${atlas.activeDrawVertices.length}`);
  console.assert(!!atlas.activeDrawPolyline, 'Active polyline preview should exist');

  // 4. Complete boundary drawing and open modal
  atlas.completeTerritoryDrawing();
  console.assert(territoryModal.style.display === 'flex', 'Territory modal should open on complete drawing');

  // Fill in modal fields
  window.document.getElementById('territory-title-input').value = 'Empire of Valoria';
  window.document.getElementById('territory-stroke-color-input').value = '#ef4444';
  window.document.getElementById('territory-stroke-width-input').value = 4;
  window.document.getElementById('territory-stroke-style-select').value = 'dashed';
  window.document.getElementById('territory-fill-color-input').value = '#ef4444';
  window.document.getElementById('territory-fill-opacity-input').value = '0.35';

  // 5. Save Territory
  await atlas.saveTerritory();

  console.assert(createdTerritories.length === 1, `Expected 1 created territory, got ${createdTerritories.length}`);
  const terr = createdTerritories[0];
  console.assert(terr.title === 'Empire of Valoria', `Title mismatch: ${terr.title}`);
  console.assert(terr.stroke_style === 'dashed', `Stroke style mismatch: ${terr.stroke_style}`);
  console.assert(atlas.territoryPolygons.length === 1, `Expected 1 polygon rendered on canvas, got ${atlas.territoryPolygons.length}`);

  // 6. Test Interactive Vertex Handles in DM mode
  atlas.selectTerritoryForEditing(terr);
  console.assert(atlas.activeVertexMarkers.length > 0, 'Vertex and midpoint handles should be rendered on canvas');

  const initialHandleCount = atlas.activeVertexMarkers.length; // 3 vertex + 3 midpoint = 6
  console.assert(initialHandleCount === 6, `Expected 6 handle markers (3 vertex + 3 midpoint), got ${initialHandleCount}`);

  // Test Midpoint Handle Insertion (click midpoint)
  const midpointMarker = atlas.activeVertexMarkers.find(m => m._midIndex === 0);
  console.assert(!!midpointMarker, 'Midpoint handle 0 should exist');
  midpointMarker.events['click']({});

  // Allow async handling
  await new Promise(r => setTimeout(r, 50));
  const parsedPoints = JSON.parse(terr.points_json);
  console.assert(parsedPoints.length === 4, `Expected 4 vertices after midpoint insertion, got ${parsedPoints.length}`);

  // Test Vertex Node Deletion (right click vertex handle)
  const vertexHandle = atlas.activeVertexMarkers.find(m => m._vertexIndex === 0);
  console.assert(!!vertexHandle, 'Vertex handle 0 should exist');
  vertexHandle.events['contextmenu']({ originalEvent: { preventDefault: () => {} } });

  await new Promise(r => setTimeout(r, 50));
  const pointsAfterDelete = JSON.parse(terr.points_json);
  console.assert(pointsAfterDelete.length === 3, `Expected 3 vertices after vertex node deletion, got ${pointsAfterDelete.length}`);

  // 7. Test Layer Hiding (territory with layer_id should hide when layer is unchecked)
  terr.layer_id = 'layer-1';
  atlas.layers[0].is_visible = 0; // hide layer 1
  atlas.renderTerritoriesOnCanvas();
  console.assert(atlas.territoryPolygons.length === 0, 'Territory should be hidden when its layer is toggled invisible');

  atlas.layers[0].is_visible = 1;
  atlas.renderTerritoriesOnCanvas();
  console.assert(atlas.territoryPolygons.length === 1, 'Territory should re-appear when layer is toggled visible');

  // 8. Test Delete Territory
  await atlas.deleteTerritory(terr.id);
  console.assert(createdTerritories.length === 0, 'Territory array should be empty after deletion');

  console.log('✅ ALL TASK 3 TERRITORY DRAWING & VERTEX HANDLE TESTS PASSED SUCCESSFULLY!');
}

test().then(() => {
  dom.window.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
