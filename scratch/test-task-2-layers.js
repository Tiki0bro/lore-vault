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
      on: () => {}
    })
  })
};

const mockMaps = [{ id: 'map-1', title: 'Aethelgard World Map', width: 1920, height: 1080, image_path: '/uploads/map.jpg' }];
const mockLayers = [
  { id: 'layer-1', map_id: 'map-1', name: 'Political Boundaries', color_badge: '#ef4444', is_visible: 1, is_secret: 0, sort_order: 0 },
  { id: 'layer-2', map_id: 'map-1', name: 'DM Hidden Ruins', color_badge: '#a855f7', is_visible: 1, is_secret: 1, sort_order: 1 }
];

window.fetch = (url) => {
  if (url.includes('/api/worlds/default/maps')) return Promise.resolve({ json: () => Promise.resolve({ maps: mockMaps }) });
  if (url.includes('/api/articles')) return Promise.resolve({ json: () => Promise.resolve([]) });
  if (url.includes('/layers')) return Promise.resolve({ json: () => Promise.resolve({ layers: mockLayers }) });
  if (url.includes('/pins')) return Promise.resolve({ json: () => Promise.resolve({ pins: [] }) });
  return Promise.resolve({ json: () => Promise.resolve({}) });
};

const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
window.eval(atlasCode);

async function test() {
  console.log('Testing AtlasView with layers...');
  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  const layersBtn = window.document.getElementById('atlas-layers-btn');
  const layersDrawer = window.document.getElementById('atlas-layers-drawer');
  const layerModal = window.document.getElementById('atlas-layer-modal');

  console.log('layersBtn:', !!layersBtn);
  console.log('layersDrawer:', !!layersDrawer);
  console.log('layerModal:', !!layerModal);

  atlas.toggleLayersDrawer(true);
  console.log('drawer display after open:', layersDrawer.style.display);

  atlas.toggleLayersDrawer(false);
  console.log('drawer display after close:', layersDrawer.style.display);

  atlas.toggleLayersDrawer(true);
  const items = window.document.querySelectorAll('.layer-item');
  console.log('layer items count:', items.length);

  const chk1 = items[0].querySelector('.layer-visibility-checkbox');
  chk1.checked = false;
  chk1.dispatchEvent(new window.Event('change'));
  console.log('layer 0 is_visible:', atlas.layers[0].is_visible);

  console.log('SUCCESS: All checks completed');
}

test().then(() => {
  dom.window.close();
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
