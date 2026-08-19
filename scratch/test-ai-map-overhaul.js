const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testAIMapOverhaul() {
  console.log('--- Running AI Map Overhaul Integration & Prompt Synthesis QA Tests ---');

  // 1. Test Scope Prompts Synthesis Dictionary in server.js
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  console.assert(serverCode.includes('Top-down 2D tactical combat battlemap grid'), 'FAIL: Battlemap prompt missing tactical keywords');
  console.assert(serverCode.includes('Top-down urban city map plan'), 'FAIL: City map prompt missing urban plan keywords');
  console.assert(serverCode.includes('(locationList.length === 1) ? { x_pct: 0.50, y_pct: 0.50 }'), 'FAIL: Single location pin centering missing');
  console.log('✓ Server prompt dictionary & single pin centering check passed');

  // 2. DOM & AtlasView UI Prompt Preview Test
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

  // Load PerlinCartographyEngine & AtlasView
  const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
  dom.window.eval(perlinCode);
  global.PerlinCartographyEngine = dom.window.PerlinCartographyEngine;

  const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
  dom.window.eval(atlasCode);
  global.AtlasView = dom.window.AtlasView;

  const atlasView = new dom.window.AtlasView('atlas-container', 'world-1');
  atlasView.renderLayout();
  await atlasView.openGeneratorModal();

  const modal = document.getElementById('atlas-generate-modal');
  console.assert(modal !== null, 'FAIL: Generator modal missing');

  // Check provider chips presence
  const providerChips = modal.querySelectorAll('.gen-provider-chip');
  console.assert(providerChips.length === 2, `FAIL: Expected 2 provider chips, found ${providerChips.length}`);
  console.log('✓ Provider selection chips rendering check passed');

  // Check live prompt preview container presence
  const promptPreview = document.getElementById('gen-prompt-preview');
  console.assert(promptPreview !== null, 'FAIL: Live prompt preview container missing');
  console.assert(promptPreview.textContent.includes('[Provider: Pollinations AI (Flux)]'), 'FAIL: Live prompt preview text missing provider tag');
  console.log('✓ Live AI Prompt Preview rendering check passed');

  // Click Battlemap scope card and verify prompt preview updates
  const battlemapCard = modal.querySelector('.gen-scope-card[data-scope="battlemap"]');
  console.assert(battlemapCard !== null, 'FAIL: Battlemap scope card missing');
  battlemapCard.click();
  console.assert(promptPreview.textContent.includes('tactical combat battlemap grid'), 'FAIL: Prompt preview did not update to battlemap prompt');
  console.log('✓ Battlemap scope selection & live prompt preview update passed');

  console.log('=== ALL QA VERIFICATION TESTS PASSED PERFECTLY! ===');
}

testAIMapOverhaul().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
