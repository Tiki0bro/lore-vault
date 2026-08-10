const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`);
const window = dom.window;
const document = window.document;

let lastPanTarget = null;

// Mock Leaflet object
window.L = {
  CRS: { Simple: {} },
  map: () => ({
    remove: () => {},
    fitBounds: () => {},
    on: (evt, cb) => {},
    panTo: (latlng) => {
      lastPanTarget = latlng;
    },
    setView: (latlng) => {
      lastPanTarget = latlng;
    }
  }),
  imageOverlay: () => ({
    addTo: () => {}
  }),
  marker: (latlng, opts) => ({
    latlng,
    opts,
    _icon: { classList: { add: () => {} } },
    addTo: function() {
      return this;
    },
    bindTooltip: function() { return this; },
    on: function() { return this; },
    remove: function() {}
  }),
  polyline: () => ({
    addTo: () => ({
      setLatLngs: () => {},
      remove: () => {}
    }),
    setLatLngs: () => {},
    remove: () => {}
  }),
  polygon: () => ({
    addTo: () => ({
      bindTooltip: () => {},
      on: () => {},
      remove: () => {},
      setStyle: () => {}
    }),
    remove: () => {}
  }),
  divIcon: (opts) => opts
};

const mockMaps = [
  { id: 'map-filter-1', title: 'World of Aethelgard', width: 1000, height: 1000, image_path: '/uploads/map1.jpg' }
];

const mockArticles = [
  { id: 'art-1', title: 'Oakhaven Citadel History', category: 'Settlements' },
  { id: 'art-2', title: 'The Shadow Dungeon', category: 'Dungeons' },
  { id: 'art-3', title: 'Ironclad Fortress Defenses', category: 'Fortresses' }
];

const mockPins = [
  { id: 'pin-1', map_id: 'map-filter-1', article_id: 'art-1', label: 'Oakhaven City Citadel', category: 'Settlements', x_pct: 0.2, y_pct: 0.3, pin_color: '#38bdf8' },
  { id: 'pin-2', map_id: 'map-filter-1', article_id: 'art-2', label: 'Dungeon of Shadows', category: 'Dungeons', x_pct: 0.5, y_pct: 0.5, pin_color: '#ef4444' },
  { id: 'pin-3', map_id: 'map-filter-1', article_id: 'art-3', label: 'Ironclad Garrison', category: 'Fortresses', x_pct: 0.8, y_pct: 0.7, pin_color: '#f59e0b' },
  { id: 'pin-4', map_id: 'map-filter-1', article_id: null, label: 'Whispering Ruins', category: 'Dungeons', x_pct: 0.4, y_pct: 0.6, pin_color: '#a855f7' }
];

const mockFetch = async (url, opts = {}) => {
  if (url.includes('/api/worlds/default/maps')) {
    return { ok: true, json: async () => ({ maps: mockMaps }) };
  }
  if (url.includes('/api/articles')) {
    return { ok: true, json: async () => mockArticles };
  }
  if (url.includes('/tree')) {
    return { ok: true, json: async () => ({ map: mockMaps[0], ancestors: [] }) };
  }
  if (url.includes('/layers')) {
    return { ok: true, json: async () => ({ layers: [] }) };
  }
  if (url.includes('/pins')) {
    return { ok: true, json: async () => ({ pins: mockPins }) };
  }
  if (url.includes('/territories')) {
    return { ok: true, json: async () => ({ territories: [] }) };
  }
  return { ok: true, json: async () => ({}) };
};

window.fetch = mockFetch;
global.fetch = mockFetch;

const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
const AtlasViewClass = new Function('window', 'document', 'L', 'fetch', `${atlasCode}; return AtlasView;`)(window, document, window.L, mockFetch);
window.AtlasView = AtlasViewClass;

async function runTests() {
  console.log('--- Task 4 Verification Test Suite: Pin Search Input & Category Filter Chips ---');

  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  // Test 1: DOM Elements Rendered
  const searchInput = document.getElementById('atlas-pin-search');
  const categoryBar = document.getElementById('atlas-pin-category-bar');
  const chips = document.querySelectorAll('.atlas-category-chip');
  const clearBtn = document.getElementById('atlas-pin-clear-filter-btn');

  if (!searchInput) throw new Error('FAILED: #atlas-pin-search missing from DOM');
  if (!categoryBar) throw new Error('FAILED: #atlas-pin-category-bar missing from DOM');
  if (chips.length !== 8) throw new Error(`FAILED: Expected 8 category chips, found ${chips.length}`);
  if (!clearBtn) throw new Error('FAILED: #atlas-pin-clear-filter-btn missing from DOM');

  console.log('✓ Test 1 Passed: Search bar, category chips bar (8 chips), and clear filter button rendered');

  // Test 2: Initial Pin Rendering
  if (atlas.markers.length !== 4) {
    throw new Error(`FAILED: Expected 4 initial markers, got ${atlas.markers.length}`);
  }
  console.log('✓ Test 2 Passed: Initial load renders all 4 map pins on canvas');

  // Test 3: Category Filtering (Dungeons)
  const dungeonsChip = Array.from(chips).find(c => c.getAttribute('data-category') === 'dungeons');
  if (!dungeonsChip) throw new Error('FAILED: Dungeons category chip not found');

  dungeonsChip.click();

  if (atlas.selectedPinCategory !== 'dungeons') {
    throw new Error(`FAILED: Expected selectedPinCategory to be "dungeons", got "${atlas.selectedPinCategory}"`);
  }
  if (atlas.markers.length !== 2) {
    throw new Error(`FAILED: Expected 2 markers for "dungeons" category, got ${atlas.markers.length}`);
  }
  if (clearBtn.style.display === 'none') {
    throw new Error('FAILED: Clear filter button should be visible when category filter is active');
  }

  console.log('✓ Test 3 Passed: Category chip filtering (Dungeons -> 2 matching pins) validated');

  // Test 4: Text Search Query (Case-Insensitive Substring Match & Marker Highlight)
  // Reset category to all first
  atlas.clearPinFilters();
  if (atlas.markers.length !== 4) throw new Error('FAILED: Reset filter did not restore all 4 markers');

  searchInput.value = 'oakhaven';
  searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));

  if (atlas.pinSearchQuery !== 'oakhaven') {
    throw new Error(`FAILED: Expected pinSearchQuery to be "oakhaven", got "${atlas.pinSearchQuery}"`);
  }
  if (atlas.markers.length !== 1) {
    throw new Error(`FAILED: Expected 1 marker matching "oakhaven", got ${atlas.markers.length}`);
  }
  if (!atlas.markers[0]._isHighlighted) {
    throw new Error('FAILED: Matching marker should have _isHighlighted flag set to true');
  }
  console.log('✓ Test 4 Passed: Text search query ("oakhaven" -> 1 match, highlighted) validated');

  // Test 5: Auto-Pan Map on Single Match
  // Pin-1 coordinates: x_pct = 0.2, y_pct = 0.3 on 1000x1000 map -> lat = 300, lng = 200
  if (!lastPanTarget) throw new Error('FAILED: Auto-pan did not fire for single match query');
  if (lastPanTarget[0] !== 300 || lastPanTarget[1] !== 200) {
    throw new Error(`FAILED: Expected auto-pan target [300, 200], got [${lastPanTarget}]`);
  }
  console.log('✓ Test 5 Passed: Auto-pan map centers view on target pin [300, 200] for single search match');

  // Test 6: Text Search matching via Linked Article Title
  searchInput.value = 'Ironclad';
  searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));

  if (atlas.markers.length !== 1) {
    throw new Error(`FAILED: Expected 1 marker matching linked article title "Ironclad", got ${atlas.markers.length}`);
  }
  if (atlas.markers[0]._pinData.label !== 'Ironclad Garrison') {
    throw new Error(`FAILED: Expected matching pin label "Ironclad Garrison", got "${atlas.markers[0]._pinData.label}"`);
  }
  console.log('✓ Test 6 Passed: Text search matches linked article title ("Ironclad" -> 1 match)');

  // Test 7: 1-Click Clear Filter Button
  clearBtn.click();

  if (atlas.pinSearchQuery !== '') throw new Error('FAILED: Clear filter button did not clear pinSearchQuery');
  if (atlas.selectedPinCategory !== 'all') throw new Error('FAILED: Clear filter button did not reset selectedPinCategory');
  if (searchInput.value !== '') throw new Error('FAILED: Search input field not cleared');
  if (clearBtn.style.display !== 'none') throw new Error('FAILED: Clear filter button not hidden after clear');
  if (atlas.markers.length !== 4) throw new Error(`FAILED: Clear filter button did not restore 4 markers (got ${atlas.markers.length})`);

  const activeChip = document.querySelector('.atlas-category-chip.active');
  if (!activeChip || activeChip.getAttribute('data-category') !== 'all') {
    throw new Error('FAILED: "All" category chip is not active after clearing filters');
  }

  console.log('✓ Test 7 Passed: 1-Click Clear Filter button resets state, UI elements, and restores all markers');

  console.log('\n======================================================');
  console.log('ALL TASK 4 PIN SEARCH & FILTER TESTS PASSED 100%!');
  console.log('======================================================');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
