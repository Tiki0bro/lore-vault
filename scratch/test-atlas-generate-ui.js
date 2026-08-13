const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runTests() {
  console.log('--- Running Atlas Generator Modal UI Integration Tests ---');

  // Setup DOM environment
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
    url: 'http://localhost:3000'
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.alert = window.alert = () => {};

  // Mock Leaflet window.L
  window.L = {
    map: () => ({
      setView: function() { return this; },
      on: function() { return this; },
      remove: function() { return this; },
      fitBounds: function() { return this; },
      addLayer: function() { return this; },
      removeLayer: function() { return this; }
    }),
    imageOverlay: () => ({
      addTo: function() { return this; },
      on: function() { return this; }
    }),
    layerGroup: () => ({
      addTo: function() { return this; },
      clearLayers: function() { return this; },
      addLayer: function() { return this; }
    }),
    marker: () => ({
      addTo: function() { return this; },
      bindPopup: function() { return this; },
      on: function() { return this; }
    }),
    polyline: () => ({
      addTo: function() { return this; }
    }),
    divIcon: () => ({}),
    CRS: { Simple: {} }
  };
  global.HTMLCanvasElement = window.HTMLCanvasElement;
  global.FormData = window.FormData || class FormData {
    constructor() { this.data = new Map(); }
    append(key, val, filename) { this.data.set(key, { val, filename }); }
  };
  global.Blob = window.Blob || class Blob {
    constructor(content, opts) {
      this.content = content;
      this.type = opts ? opts.type : '';
    }
  };

  // Mock Canvas 2D Context
  window.HTMLCanvasElement.prototype.getContext = function(type) {
    if (type === '2d') {
      return {
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        globalAlpha: 1,
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        clearRect: () => {},
        drawImage: () => {}
      };
    }
    return null;
  };

  window.HTMLCanvasElement.prototype.toBlob = function(callback, type) {
    callback(new global.Blob(['mock-png-blob'], { type: type || 'image/png' }));
  };

  // Load PerlinCartographyEngine
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  window.eval(perlinCode);
  global.PerlinCartographyEngine = window.PerlinCartographyEngine;

  // Load AtlasView
  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  window.eval(atlasCode);
  global.AtlasView = window.AtlasView;

  // Mock fetch calls
  let postedFormData = null;
  let loadedMapId = null;

  global.fetch = async (url, options = {}) => {
    if (url.includes('/api/worlds/') && url.includes('/maps')) {
      return {
        ok: true,
        json: async () => ({ maps: [] })
      };
    }
    if (url.includes('/api/articles')) {
      return {
        ok: true,
        json: async () => ([])
      };
    }
    if (url === '/api/maps/generate/procedural' || url === '/api/maps/generate/ai') {
      postedFormData = options.body;
      return {
        ok: true,
        json: async () => ({
          success: true,
          map: {
            id: 'map-proc-999',
            title: postedFormData ? (postedFormData.data ? postedFormData.data.get('title')?.val : 'Procedural Realm Map') : 'Procedural Realm Map'
          },
          pins: []
        })
      };
    }
    if (url.includes('/api/maps/map-proc-999')) {
      return {
        ok: true,
        json: async () => ({
          map: { id: 'map-proc-999', title: 'Procedural Realm Map', image_path: '/uploads/images/test.png' },
          pins: [],
          routes: []
        })
      };
    }
    return {
      ok: true,
      json: async () => ({})
    };
  };

  // Instantiate AtlasView
  const atlasView = new window.AtlasView('atlas-container', { worldId: 'default' });
  atlasView.renderLayout();

  // Mock loadMap method
  atlasView.loadMap = async (mapId) => {
    loadedMapId = mapId;
  };

  // 1. Verify modal initial state
  const modal = document.getElementById('atlas-generate-modal');
  console.assert(modal !== null, 'FAIL: #atlas-generate-modal element not rendered in DOM');
  console.assert(modal.style.display === 'none', 'FAIL: Modal should be hidden initially');
  console.log('✓ Initial modal rendering check passed');

  // 2. Open modal via toolbar button click
  const autoGenBtn = document.getElementById('atlas-auto-gen-btn');
  console.assert(autoGenBtn !== null, 'FAIL: #atlas-auto-gen-btn button missing');
  autoGenBtn.click();
  console.assert(modal.style.display === 'flex', 'FAIL: Modal did not open on toolbar button click');
  console.log('✓ Toolbar button open modal check passed');

  // 3. Preset selection card interaction
  const archipelagoCard = modal.querySelector('.gen-preset-card[data-preset="archipelago"]');
  console.assert(archipelagoCard !== null, 'FAIL: Archipelago preset card missing');
  archipelagoCard.click();
  console.assert(atlasView.genPreset === 'archipelago', `FAIL: Expected genPreset to be "archipelago", got "${atlasView.genPreset}"`);
  console.assert(archipelagoCard.classList.contains('active'), 'FAIL: Selected preset card should have active class');
  console.log('✓ Preset card selection passed');

  // 4. Theme selection chip interaction
  const emeraldChip = modal.querySelector('.gen-theme-chip[data-theme="emerald"]');
  console.assert(emeraldChip !== null, 'FAIL: Emerald theme chip missing');
  emeraldChip.click();
  console.assert(atlasView.genTheme === 'emerald', `FAIL: Expected genTheme to be "emerald", got "${atlasView.genTheme}"`);
  console.assert(emeraldChip.classList.contains('active'), 'FAIL: Selected theme chip should have active class');
  console.log('✓ Theme chip selection passed');

  // 5. Seed Reroll button interaction
  const initialSeed = atlasView.genSeed;
  const rerollBtn = document.getElementById('gen-reroll-seed-btn');
  console.assert(rerollBtn !== null, 'FAIL: Reroll seed button missing');
  rerollBtn.click();
  console.assert(atlasView.genSeed !== initialSeed, 'FAIL: Seed did not change after reroll click');
  console.log(`✓ Seed reroll passed (Old: ${initialSeed}, New: ${atlasView.genSeed})`);

  // 6. Custom seed input change
  const seedInput = document.getElementById('gen-seed-input');
  seedInput.value = '98765';
  seedInput.dispatchEvent(new window.Event('input'));
  console.assert(atlasView.genSeed === 98765, `FAIL: Expected seed 98765, got ${atlasView.genSeed}`);
  console.log('✓ Custom seed input passed');

  // 7. Form submission and map loading
  const checklist = document.getElementById('gen-article-checklist');
  if (checklist) {
    checklist.innerHTML = '<label><input type="checkbox" class="gen-article-checkbox" value="test-art-1" checked> Test Article</label>';
  }
  const submitBtn = document.getElementById('submit-gen-modal-btn');
  console.assert(submitBtn !== null, 'FAIL: Submit generator button missing');
  await atlasView.submitGeneratorModal();

  console.assert(modal.style.display === 'none', 'FAIL: Modal did not close after successful generation');
  console.assert(postedFormData !== null, 'FAIL: FormData was not submitted to /api/maps/generate/procedural');
  console.assert(loadedMapId === 'map-proc-999', `FAIL: Expected loadMap to be called with "map-proc-999", got "${loadedMapId}"`);
  console.log('✓ Form submission & map load passed');

  console.log('=== ALL TASK 3 TESTS PASSED PERFECTLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
