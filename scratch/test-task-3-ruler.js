const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`);
const window = dom.window;
const document = window.document;

// Mock Leaflet object
window.L = {
  CRS: { Simple: {} },
  map: () => ({
    remove: () => {},
    fitBounds: () => {},
    on: (evt, cb) => {}
  }),
  imageOverlay: () => ({
    addTo: () => {}
  }),
  marker: () => ({
    addTo: () => ({
      bindTooltip: () => {},
      on: () => {},
      remove: () => {}
    }),
    remove: () => {}
  }),
  polyline: () => ({
    addTo: () => ({
      setLatLngs: () => {},
      remove: () => {}
    }),
    setLatLngs: () => {},
    remove: () => {}
  }),
  divIcon: (opts) => opts
};

const mockMaps = [
  { id: 'map-scale-1', title: 'World of Aethelgard', width: 1920, height: 1080, image_path: '/uploads/map1.jpg', scale_pixels: 100.0, scale_distance: 10.0, scale_unit: 'miles' }
];

let lastPutPayload = null;
let lastPutUrl = null;

const mockFetch = async (url, opts = {}) => {
  if (opts.method === 'PUT' && url.includes('/scale')) {
    lastPutUrl = url;
    lastPutPayload = JSON.parse(opts.body || '{}');
    return {
      ok: true,
      json: async () => ({
        success: true,
        map: {
          ...mockMaps[0],
          scale_pixels: lastPutPayload.scale_pixels,
          scale_distance: lastPutPayload.scale_distance,
          scale_unit: lastPutPayload.scale_unit
        }
      })
    };
  }

  if (url.includes('/api/worlds/default/maps')) {
    return { ok: true, json: async () => ({ maps: mockMaps }) };
  }
  if (url.includes('/api/articles')) {
    return { ok: true, json: async () => [] };
  }
  if (url.includes('/tree')) {
    return { ok: true, json: async () => ({ map: mockMaps[0], ancestors: [] }) };
  }
  if (url.includes('/layers')) {
    return { ok: true, json: async () => ({ layers: [] }) };
  }
  if (url.includes('/pins')) {
    return { ok: true, json: async () => ({ pins: [] }) };
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
  console.log('--- Task 3 Verification Test Suite: Scale Ruler & Travel Time Calculator ---');

  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  // Test 1: Verify Toolbar Button and DOM Elements Rendered
  const rulerBtn = document.getElementById('atlas-ruler-mode-btn');
  const toastEl = document.getElementById('atlas-ruler-toast');
  const modalEl = document.getElementById('atlas-scale-modal');

  if (!rulerBtn) throw new Error('FAILED: #atlas-ruler-mode-btn missing from DOM');
  if (!toastEl) throw new Error('FAILED: #atlas-ruler-toast missing from DOM');
  if (!modalEl) throw new Error('FAILED: #atlas-scale-modal missing from DOM');
  console.log('✓ Test 1 Passed: Ruler button, toast, and scale calibration modal rendered in DOM');

  // Test 2: Distance Math Calculation
  const pts = [[0, 0], [300, 400]]; // Euclidean dist = 500 px
  const pxDist = atlas.calculatePixelDistance(pts);
  if (pxDist !== 500) {
    throw new Error(`FAILED: Expected 500 px distance, got ${pxDist}`);
  }

  // With scale_pixels = 100, scale_distance = 10 -> real dist = (500 / 100) * 10 = 50 miles
  const realDist = atlas.calculateRealDistance(500, 100, 10);
  if (realDist !== 50) {
    throw new Error(`FAILED: Expected 50 miles, got ${realDist}`);
  }

  // Multi-segment polyline: (0,0) -> (300,400) [500px] -> (300, 800) [400px] = 900px
  const pts2 = [[0, 0], [300, 400], [300, 800]];
  const pxDist2 = atlas.calculatePixelDistance(pts2);
  if (pxDist2 !== 900) {
    throw new Error(`FAILED: Expected 900 px multi-segment distance, got ${pxDist2}`);
  }
  console.log('✓ Test 2 Passed: Euclidean distance math & scale conversions validated');

  // Test 3: Travel Time Estimators
  const travel = atlas.calculateTravelTimes(150); // 150 miles
  if (travel.footDays !== 5.0) throw new Error(`FAILED: Foot travel days expected 5.0, got ${travel.footDays}`);
  if (travel.horseDays !== 2.5) throw new Error(`FAILED: Horse travel days expected 2.5, got ${travel.horseDays}`);
  if (travel.sailDays !== 1.5) throw new Error(`FAILED: Sail travel days expected 1.5, got ${travel.sailDays}`);

  // Duration Formatting
  if (atlas.formatTravelTime(0) !== '0 days') throw new Error('FAILED: 0 days format incorrect');
  if (atlas.formatTravelTime(0.25) !== '6 hrs') throw new Error(`FAILED: 0.25 days expected "6 hrs", got "${atlas.formatTravelTime(0.25)}"`);
  if (atlas.formatTravelTime(2.5) !== '2.5 days') throw new Error(`FAILED: 2.5 days expected "2.5 days", got "${atlas.formatTravelTime(2.5)}"`);
  console.log('✓ Test 3 Passed: Travel time estimator (Foot/Horse/Sail) and formatting validated');

  // Test 4: Measuring Tape Mode Toggle & Toast Update
  atlas.toggleRulerMode(true);
  if (!atlas.isRulerActive) throw new Error('FAILED: Ruler mode active flag not set');
  if (toastEl.style.display !== 'flex') throw new Error('FAILED: #atlas-ruler-toast not visible when ruler active');

  atlas.addRulerPoint(0, 0);
  atlas.addRulerPoint(300, 400); // 500 px -> 50 miles

  const distVal = document.getElementById('ruler-distance-val').textContent;
  const distUnit = document.getElementById('ruler-distance-unit').textContent;
  const footVal = document.getElementById('ruler-time-foot').textContent;
  const horseVal = document.getElementById('ruler-time-horse').textContent;
  const sailVal = document.getElementById('ruler-time-sail').textContent;

  if (distVal !== '50.0') throw new Error(`FAILED: Expected distance text "50.0", got "${distVal}"`);
  if (distUnit !== 'miles') throw new Error(`FAILED: Expected unit "miles", got "${distUnit}"`);
  if (footVal !== '1.7 days') throw new Error(`FAILED: Expected foot time "1.7 days", got "${footVal}"`);
  if (horseVal !== '20 hrs') throw new Error(`FAILED: Expected horse time "20 hrs", got "${horseVal}"`);
  if (sailVal !== '12 hrs') throw new Error(`FAILED: Expected sail time "12 hrs", got "${sailVal}"`);
  console.log('✓ Test 4 Passed: Measuring tape points update toast distance and travel times dynamically');

  // Test 5: Clear Ruler Tape
  atlas.clearRulerTape();
  if (atlas.rulerPoints.length !== 0) throw new Error('FAILED: rulerPoints array not cleared');
  const distCleared = document.getElementById('ruler-distance-val').textContent;
  if (distCleared !== '0.0') throw new Error(`FAILED: Expected cleared distance "0.0", got "${distCleared}"`);
  console.log('✓ Test 5 Passed: Clear ruler tape resets points and resets toast display');

  // Test 6: Scale Calibration Modal & API Endpoint Update
  atlas.openScaleModal();
  if (modalEl.style.display !== 'flex') throw new Error('FAILED: Scale modal not displayed');

  document.getElementById('scale-pixels-input').value = '200';
  document.getElementById('scale-distance-input').value = '50';
  document.getElementById('scale-unit-input').value = 'leagues';

  await atlas.saveMapScale();

  if (!lastPutUrl || !lastPutUrl.includes('/api/maps/map-scale-1/scale')) {
    throw new Error(`FAILED: Scale calibration PUT endpoint not called correctly. URL: ${lastPutUrl}`);
  }
  if (lastPutPayload.scale_pixels !== 200 || lastPutPayload.scale_distance !== 50 || lastPutPayload.scale_unit !== 'leagues') {
    throw new Error('FAILED: PUT payload does not match updated input values');
  }
  if (atlas.currentMap.scale_unit !== 'leagues') {
    throw new Error('FAILED: Current map scale_unit not updated in memory');
  }
  console.log('✓ Test 6 Passed: Scale calibration modal updates map scale via PUT API endpoint');

  console.log('\n======================================================');
  console.log('ALL TASK 3 DISTANCE RULER & SCALE TESTS PASSED 100%!');
  console.log('======================================================');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
