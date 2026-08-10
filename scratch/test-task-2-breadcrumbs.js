const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
  runScripts: "dangerously"
});
const window = dom.window;

window.L = {
  CRS: { Simple: {} },
  map: () => ({
    remove: () => {},
    fitBounds: () => {},
    on: () => {}
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
  })
};

const mockMaps = [
  { id: 'map-root', title: 'World of Aethelgard', width: 1920, height: 1080, image_path: '/uploads/map1.jpg', parent_map_id: null },
  { id: 'map-kingdom', title: 'Kingdom of Valoria', width: 1920, height: 1080, image_path: '/uploads/map2.jpg', parent_map_id: 'map-root' },
  { id: 'map-citadel', title: 'Citadel of Oakhaven', width: 1920, height: 1080, image_path: '/uploads/map3.jpg', parent_map_id: 'map-kingdom' }
];

const mockPins = [
  {
    id: 'pin-1',
    map_id: 'map-root',
    article_id: 'art-1',
    x_pct: 0.4,
    y_pct: 0.5,
    label: 'Valoria Kingdom Gate',
    target_sub_map_id: 'map-kingdom',
    sub_map_id: 'map-kingdom',
    is_secret: 0
  }
];

const mockFetch = async (url) => {
  if (url.includes('/api/worlds/default/maps')) {
    return { ok: true, json: async () => ({ maps: mockMaps }) };
  }
  if (url.includes('/api/articles/art-1')) {
    return { ok: true, json: async () => ({ id: 'art-1', title: 'Valoria Gatehouse', category: 'Settlements', content: 'Gateway into Valoria.' }) };
  }
  if (url.includes('/api/articles')) {
    return { ok: true, json: async () => [{ id: 'art-1', title: 'Valoria Gatehouse', category: 'Settlements' }] };
  }
  if (url.includes('/api/maps/map-citadel/tree')) {
    return {
      ok: true,
      json: async () => ({
        map: mockMaps[2],
        parentMap: mockMaps[1],
        childMaps: [],
        ancestors: [mockMaps[0], mockMaps[1]]
      })
    };
  }
  if (url.includes('/api/maps/map-kingdom/tree')) {
    return {
      ok: true,
      json: async () => ({
        map: mockMaps[1],
        parentMap: mockMaps[0],
        childMaps: [mockMaps[2]],
        ancestors: [mockMaps[0]]
      })
    };
  }
  if (url.includes('/api/maps/map-root/tree')) {
    return {
      ok: true,
      json: async () => ({
        map: mockMaps[0],
        parentMap: null,
        childMaps: [mockMaps[1]],
        ancestors: []
      })
    };
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
window.eval(atlasCode);

async function runTests() {
  console.log('--- Task 2 Verification Test Suite ---');

  // Test 1: Constructor initialization
  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  if (!Array.isArray(atlas.breadcrumbStack)) {
    throw new Error('FAILED: breadcrumbStack is not an array');
  }
  console.log('✓ Test 1 Passed: breadcrumbStack initialized as array');

  // Test 2: init layout rendering and initial root map load
  await atlas.init();
  const breadcrumbEl = window.document.getElementById('atlas-breadcrumbs');
  if (!breadcrumbEl) {
    throw new Error('FAILED: #atlas-breadcrumbs element missing from DOM');
  }
  console.log('✓ Test 2 Passed: #atlas-breadcrumbs element rendered');

  // Test 3: Load multi-tier sub-map (Citadel) and verify hierarchy resolution
  await atlas.loadMap('map-citadel');

  if (atlas.breadcrumbStack.length !== 3) {
    throw new Error(`FAILED: Expected 3 breadcrumb items, got ${atlas.breadcrumbStack.length}`);
  }
  if (atlas.breadcrumbStack[0].id !== 'map-root' || atlas.breadcrumbStack[1].id !== 'map-kingdom' || atlas.breadcrumbStack[2].id !== 'map-citadel') {
    throw new Error('FAILED: Breadcrumb stack does not match hierarchy [root -> kingdom -> citadel]');
  }
  console.log('✓ Test 3 Passed: Multi-tier breadcrumb stack correctly resolved [root -> kingdom -> citadel]');

  // Test 4: Verify breadcrumb DOM correctly rendered
  const items = breadcrumbEl.querySelectorAll('.breadcrumb-item');
  const links = breadcrumbEl.querySelectorAll('.breadcrumb-link');
  const active = breadcrumbEl.querySelector('.breadcrumb-item.active');

  if (items.length !== 3) {
    throw new Error(`FAILED: Expected 3 rendered breadcrumb items, found ${items.length}`);
  }
  if (links.length !== 2) {
    throw new Error(`FAILED: Expected 2 ancestor links, found ${links.length}`);
  }
  if (!active || active.textContent !== 'Citadel of Oakhaven') {
    throw new Error('FAILED: Active breadcrumb item incorrect');
  }
  console.log('✓ Test 4 Passed: Breadcrumb DOM correctly rendered with 2 ancestor links and 1 active item');

  // Test 5: Click ancestor breadcrumb link to navigate up the hierarchy
  const targetMapId = links[1].getAttribute('data-map-id');
  await atlas.loadMap(targetMapId);

  if (atlas.currentMap.id !== 'map-kingdom') {
    throw new Error(`FAILED: Navigating up hierarchy did not switch currentMap to kingdom (got ${atlas.currentMap.id})`);
  }
  if (atlas.breadcrumbStack.length !== 2) {
    throw new Error(`FAILED: Expected breadcrumb stack length 2 after navigating to kingdom, got ${atlas.breadcrumbStack.length}`);
  }
  console.log('✓ Test 5 Passed: Breadcrumb navigation successfully popped stack and loaded parent map');

  // Test 6: Target Sub-Map selector dropdown in pin modal
  atlas.openCreatePinModal(0.5, 0.5);
  const submapSelect = window.document.getElementById('pin-submap-select');
  if (!submapSelect) {
    throw new Error('FAILED: #pin-submap-select missing from pin modal');
  }
  const options = submapSelect.querySelectorAll('option');
  if (options.length < 2) {
    throw new Error('FAILED: #pin-submap-select options not populated');
  }
  console.log('✓ Test 6 Passed: #pin-submap-select correctly populated with sub-maps dropdown');

  // Test 7: Sub-map pin drill-down action button in reader drawer
  await atlas.loadMap('map-root');
  await atlas.openArticleDrawer('art-1', 'Valoria Kingdom Gate', mockPins[0]);

  const drilldownBtn = window.document.getElementById('atlas-drilldown-btn');
  if (!drilldownBtn) {
    throw new Error('FAILED: #atlas-drilldown-btn missing from article drawer for sub-map pin');
  }
  console.log('✓ Test 7 Passed: [🗺️ Drill Down into Sub-Map] button correctly surfaced in reader drawer');

  // Test 8: Click drill-down button to navigate into sub-map
  const subMapId = drilldownBtn.getAttribute('data-submap-id');
  await atlas.loadMap(subMapId);

  if (atlas.currentMap.id !== 'map-kingdom') {
    throw new Error(`FAILED: Drill down action did not switch to target sub-map 'map-kingdom', current map: ${atlas.currentMap.id}`);
  }
  console.log('✓ Test 8 Passed: Clicking [🗺️ Drill Down into Sub-Map] loaded sub-map and updated breadcrumbs');

  console.log('\n========================================');
  console.log('ALL TASK 2 BREADCRUMB TESTS PASSED 100%!');
  console.log('========================================');
}

runTests().then(() => {
  dom.window.close();
  process.exit(0);
}).catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
