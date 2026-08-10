const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
  runScripts: "dangerously"
});
const window = dom.window;

// Mock Leaflet & SVG
class MockPolyline {
  constructor(latlngs, options) {
    this.latlngs = latlngs;
    this.options = options || {};
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  setLatLngs(latlngs) { this.latlngs = latlngs; }
}

class MockPolygon {
  constructor(latlngs, options) {
    this.latlngs = latlngs;
    this.options = options || {};
    this.events = {};
    this._path = {
      setAttribute: (attr, val) => { this.options[attr] = val; }
    };
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  bindTooltip() { return this; }
  setLatLngs(latlngs) { this.latlngs = latlngs; }
  setStyle(style) { Object.assign(this.options, style); }
  on(event, handler) { this.events[event] = handler; return this; }
}

class MockMarker {
  constructor(latlng, options) {
    this.latlng = latlng;
    this.options = options || {};
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
  map: (containerId) => {
    // Add dummy svg element inside container to test SVG pattern injection
    const el = window.document.getElementById(containerId);
    if (el) {
      const svg = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.className = 'leaflet-zoom-animated';
      el.appendChild(svg);
    }
    return {
      remove: () => {},
      fitBounds: () => {},
      on: (event, handler) => { mapClickHandlers[event] = handler; }
    };
  },
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
  { id: 'layer-1', map_id: 'map-1', name: 'Political Boundaries', color_badge: '#ef4444', is_visible: 1, is_secret: 0, sort_order: 0 }
];

let createdTerritories = [
  {
    id: 'terr-1',
    map_id: 'map-1',
    title: 'Valorian Empire',
    points_json: JSON.stringify([[0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [0.1, 0.4]]),
    stroke_color: '#ef4444',
    fill_color: '#ef4444',
    fill_opacity: 0.3,
    article_id: 'art-valoria',
    is_contested: 0
  },
  {
    id: 'terr-2',
    map_id: 'map-1',
    title: 'Drakon Dominion',
    points_json: JSON.stringify([[0.3, 0.3], [0.6, 0.3], [0.6, 0.6], [0.3, 0.6]]),
    stroke_color: '#38bdf8',
    fill_color: '#38bdf8',
    fill_opacity: 0.3,
    article_id: 'art-drakon',
    is_contested: 0
  },
  {
    id: 'terr-3',
    map_id: 'map-1',
    title: 'Isolated Isles',
    points_json: JSON.stringify([[0.7, 0.7], [0.9, 0.7], [0.9, 0.9], [0.7, 0.9]]),
    stroke_color: '#10b981',
    fill_color: '#10b981',
    fill_opacity: 0.3,
    article_id: null,
    is_contested: 0
  }
];

let createdArticles = [
  { id: 'art-valoria', title: 'Valorian Empire Lore', category: 'Factions & Nations', content: 'The great empire of Valoria.' },
  { id: 'art-drakon', title: 'Drakon Dominion Lore', category: 'Factions & Nations', content: 'The dragon lords realm.' }
];

window.fetch = (url, options = {}) => {
  const method = options.method || 'GET';

  if (url.includes('/api/worlds/default/maps')) return Promise.resolve({ json: () => Promise.resolve({ maps: mockMaps }) });
  if (url.includes('/api/articles')) {
    if (method === 'GET') return Promise.resolve({ json: () => Promise.resolve(createdArticles) });
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const newArt = { id: `art-${Date.now()}`, ...body };
      createdArticles.push(newArt);
      return Promise.resolve({ json: () => Promise.resolve({ success: true, article: newArt, id: newArt.id }) });
    }
  }
  if (url.includes('/api/audit/flesh-out-stub')) {
    const body = JSON.parse(options.body);
    return Promise.resolve({
      json: () => Promise.resolve({
        id: `stub-${Date.now()}`,
        title: body.title,
        content: `[quote]“War rages at the border.” | — Chronicle[/quote]\n\n[row]\n[col]\n[h1]${body.title}[/h1]\nA bitter conflict erupted.\n[/col]\n[/row]`
      })
    });
  }
  if (url.includes('/layers')) return Promise.resolve({ json: () => Promise.resolve({ layers: mockLayers }) });
  if (url.includes('/pins')) return Promise.resolve({ json: () => Promise.resolve({ pins: [] }) });
  if (url.includes('/territories')) {
    if (method === 'GET') {
      return Promise.resolve({ json: () => Promise.resolve({ territories: createdTerritories }) });
    }
    if (method === 'PUT') {
      const body = JSON.parse(options.body);
      const terrId = url.split('/').pop();
      const terr = createdTerritories.find(t => t.id === terrId);
      if (terr) Object.assign(terr, body);
      return Promise.resolve({ json: () => Promise.resolve({ success: true, territory: terr || body }) });
    }
  }
  return Promise.resolve({ json: () => Promise.resolve({}) });
};

window.alert = () => {};
window.confirm = () => true;

const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
window.eval(atlasCode);

async function runTests() {
  console.log('Testing Task 4: Contested Overlap Geometry Check & Conflict Lore Drawer...');

  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  // 1. Verify SVG pattern injection into Leaflet canvas SVG root
  const svgPattern = window.document.getElementById('pattern-stripe');
  console.assert(!!svgPattern, 'SVG pattern "#pattern-stripe" should be injected into canvas SVG defs');

  // 2. Verify Territory Intersection Detection
  const terr1 = createdTerritories.find(t => t.id === 'terr-1');
  const terr2 = createdTerritories.find(t => t.id === 'terr-2');
  const terr3 = createdTerritories.find(t => t.id === 'terr-3');

  console.assert(terr1.is_contested === true, 'Territory 1 (Valorian Empire) should be flagged as contested');
  console.assert(terr2.is_contested === true, 'Territory 2 (Drakon Dominion) should be flagged as contested');
  console.assert(terr3.is_contested === false, 'Territory 3 (Isolated Isles) should NOT be contested');

  // 3. Verify Leaflet polygon styling pattern fill assignment
  const poly1 = atlas.territoryPolygons.find(p => p._territoryId === 'terr-1');
  const poly3 = atlas.territoryPolygons.find(p => p._territoryId === 'terr-3');

  console.assert(poly1.options.fillColor === 'url(#pattern-stripe)', 'Contested polygon fill color should be "url(#pattern-stripe)"');
  console.assert(poly3.options.fillColor === '#10b981', 'Non-contested polygon fill color should remain standard');

  // 4. Test Contested Conflict Drawer Rendering
  poly1.events['click']({});
  const drawer = window.document.getElementById('atlas-reader-drawer');
  console.assert(drawer.style.display === 'block', 'Reader drawer should open when clicking contested polygon');

  const badge = window.document.querySelector('.contested-badge');
  console.assert(!!badge, 'Contested warning badge ".contested-badge" should be rendered in drawer');
  console.assert(badge.textContent.includes('Contested Territory Zone'), 'Badge text mismatch');

  const factionCards = window.document.querySelectorAll('.conflict-faction-card');
  console.assert(factionCards.length === 2, `Expected 2 side-by-side faction cards, got ${factionCards.length}`);

  const aiDraftBtn = window.document.getElementById('ai-draft-conflict-btn');
  console.assert(!!aiDraftBtn, 'AI Draft Border Conflict History button should be present in drawer');

  // 5. Test 1-Click AI Draft Border Conflict History Generator Button
  aiDraftBtn.click();
  await new Promise(r => setTimeout(r, 100));

  const outputDiv = window.document.getElementById('ai-draft-conflict-output');
  console.assert(outputDiv.style.display === 'block', 'AI draft output div should be visible');
  console.assert(outputDiv.textContent.includes('Border War Article Drafted & Linked!'), 'AI output success message missing');
  console.assert(terr1.contested_article_id !== undefined && terr1.contested_article_id !== null, 'Territory contested_article_id should be updated');

  console.log('✅ ALL TASK 4 CONTESTED GEOMETRY & CONFLICT DRAWER TESTS PASSED SUCCESSFULLY!');
}

runTests().then(() => {
  dom.window.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
