const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Task 5: Gemini Vision Territory Auto-Detection Test Suite ===\n');

// 1. JSDOM Setup
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
  runScripts: "dangerously"
});
const window = dom.window;

// Mock Leaflet
class MockPolygon {
  constructor(latlngs, options) {
    this.latlngs = latlngs;
    this.options = options || {};
    this.events = {};
  }
  addTo(map) { this.map = map; return this; }
  remove() { this.map = null; }
  bindTooltip() { return this; }
  setLatLngs(latlngs) { this.latlngs = latlngs; }
  setStyle(style) { Object.assign(this.options, style); }
  on(event, handler) { this.events[event] = handler; return this; }
}

window.L = {
  CRS: { Simple: {} },
  map: (containerId) => {
    return {
      remove: () => {},
      fitBounds: () => {},
      on: () => {}
    };
  },
  imageOverlay: () => ({ addTo: () => {} }),
  polygon: (latlngs, options) => new MockPolygon(latlngs, options),
  DomEvent: { stopPropagation: () => {} }
};

// Load AtlasView script into JSDOM context
const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
window.eval(atlasCode);
const AtlasView = window.AtlasView;

// Mock fetch
const mockMap = { id: 'map-vision-1', title: 'Dragon Isle', width: 1000, height: 800, image_path: '/uploads/map.jpg' };
const mockArticles = [
  { id: 'art-valoria', title: 'Valorian Empire', category: 'Factions & Nations' },
  { id: 'art-drakon', title: 'Drakon Citadel', category: 'Geography & Landmarks' }
];

let postedTerritories = [];

window.fetch = async (url, options = {}) => {
  if (url.includes('/api/worlds/default/maps')) {
    return { ok: true, json: async () => ({ maps: [mockMap] }) };
  }
  if (url.includes('/api/articles')) {
    return { ok: true, json: async () => mockArticles };
  }
  if (url.includes('/api/maps/map-vision-1/territories?mode=dm')) {
    return { ok: true, json: async () => ({ territories: postedTerritories }) };
  }
  if (url.includes('/api/maps/map-vision-1/ai-auto-boundaries')) {
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            id: 'cand-1',
            title: 'Valorian Empire Boundary',
            article_id: 'art-valoria',
            points: [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [0.1, 0.4]],
            stroke_color: '#ef4444',
            fill_color: '#ef4444'
          },
          {
            id: 'cand-2',
            title: 'Drakon Citadel Border',
            article_id: 'art-drakon',
            points: [[0.5, 0.5], [0.8, 0.5], [0.8, 0.8], [0.5, 0.8]],
            stroke_color: '#3b82f6',
            fill_color: '#3b82f6'
          }
        ]
      })
    };
  }
  if (url.includes('/api/maps/map-vision-1/territories') && options.method === 'POST') {
    const body = JSON.parse(options.body);
    const newT = { id: `terr-${Date.now()}-${Math.random()}`, ...body };
    postedTerritories.push(newT);
    return { ok: true, json: async () => ({ success: true, territory: newT }) };
  }
  return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
};

// Mock alert
window.alert = (msg) => { window._lastAlert = msg; };

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name}`);
      failed++;
    }
  }

  // Instantiate AtlasView
  const atlas = new AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  assert(atlas.currentMap !== null, 'Atlas initializes with current map');
  assert(window.document.getElementById('atlas-ai-detect-btn') !== null, 'Auto-Detect Borders button rendered in toolbar');
  assert(window.document.getElementById('atlas-ai-candidates-drawer') !== null, 'AI candidates drawer container rendered');

  // Test 1: Trigger AI Border Detection
  await atlas.triggerAiBorderDetection();
  assert(atlas.aiCandidates.length === 2, 'AI candidates fetched and stored in state');
  assert(atlas.aiGhostPolygons.length === 2, 'Ghost polygons rendered on map canvas');
  assert(atlas.aiGhostPolygons[0].options.className === 'ai-ghost-polygon', 'Ghost polygon has glowing dashed CSS class');
  assert(atlas.aiGhostPolygons[0].options.dashArray === '8, 8', 'Ghost polygon has dashed border styling');

  // Test 2: AI Candidates Drawer UI
  const drawer = window.document.getElementById('atlas-ai-candidates-drawer');
  assert(drawer.style.display === 'flex', 'AI candidates drawer opened');

  const cards = window.document.querySelectorAll('.ai-candidate-card');
  assert(cards.length === 2, 'Rendered candidate cards for each detected boundary');

  const card1Title = window.document.querySelector('.ai-candidate-card[data-id="cand-1"] .candidate-card-title');
  assert(card1Title && card1Title.textContent === 'Valorian Empire Boundary', 'Candidate card display correct title');

  // Test 3: Approve & Batch Import Candidates
  await atlas.approveSelectedAiCandidates();

  assert(postedTerritories.length === 2, 'Selected candidates batch-saved to server territories API');
  assert(postedTerritories[0].title === 'Valorian Empire Boundary', 'Imported territory has candidate title');
  assert(postedTerritories[0].article_id === 'art-valoria', 'Imported territory preserves linked article_id');
  assert(drawer.style.display === 'none', 'AI candidates drawer closed after approval');
  assert(atlas.aiGhostPolygons.length === 0, 'Ghost polygon overlays cleared after batch import approval');

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
