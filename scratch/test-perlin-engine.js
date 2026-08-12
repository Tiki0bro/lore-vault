const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { PerlinCartographyEngine } = require('../public/js/perlin-cartography');

async function runTests() {
  console.log('--- Task 2 Perlin Cartography Engine Verification ---');

  const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="test-canvas" width="400" height="300"></canvas></body></html>`, {
    virtualConsole: new (require('jsdom').VirtualConsole)()
  });
  const window = dom.window;

  // Mock HTMLCanvasElement prototype methods to prevent JSDOM missing canvas warnings
  window.HTMLCanvasElement.prototype.getContext = function(type) {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1.0,
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillText: () => {},
      closePath: () => {},
      textAlign: 'center',
      textBaseline: 'middle',
      font: '',
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    };
  };

  window.HTMLCanvasElement.prototype.toBlob = function(callback, type) {
    const dummyBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2d0b0000000049454e44ae426082', 'hex');
    callback(dummyBuffer);
  };

  const canvas = window.document.getElementById('test-canvas');

  // Verify class export
  if (!PerlinCartographyEngine) {
    throw new Error('FAILED: PerlinCartographyEngine not exported');
  }

  // Attach to window to test browser window global binding
  window.PerlinCartographyEngine = PerlinCartographyEngine;

  const engine = new window.PerlinCartographyEngine();

  // Test 1: Seed & Permutation Table Determinism
  engine.setSeed(42);
  const valSeed42_A = engine.noise2D(12.34, 56.78);
  const valSeed42_B = engine.noise2D(12.34, 56.78);
  if (valSeed42_A !== valSeed42_B) {
    throw new Error('FAILED: Noise calculation is not deterministic for same seed');
  }

  engine.setSeed(9999);
  const valSeed9999 = engine.noise2D(12.34, 56.78);
  if (valSeed42_A === valSeed9999) {
    throw new Error('FAILED: Noise calculation did not change with different seed');
  }
  console.log('✓ Test 2.1 Passed: Seed permutation & deterministic 2D noise calculation verified');

  // Test 2: Preset Geography Masks
  const presets = ['pangaea', 'archipelago', 'inland_sea', 'mountain_fjords'];
  presets.forEach(preset => {
    const centerVal = engine.calculatePresetMask(0.5, 0.5, preset);
    const cornerVal = engine.calculatePresetMask(0.05, 0.05, preset);
    if (typeof centerVal !== 'number' || typeof cornerVal !== 'number' || isNaN(centerVal) || isNaN(cornerVal)) {
      throw new Error(`FAILED: Preset mask calculation returned non-number for ${preset}`);
    }
  });
  console.log('✓ Test 2.2 Passed: Geography preset masks (pangaea, archipelago, inland_sea, mountain_fjords) verified');

  // Test 3: Aesthetic Color Themes
  const themes = ['parchment', 'void', 'emerald'];
  themes.forEach(theme => {
    const palette = engine.getColorsForTheme(theme);
    if (!palette.ocean || !palette.land || !palette.mountain || !palette.ink) {
      throw new Error(`FAILED: Theme palette incomplete for ${theme}`);
    }
  });
  console.log('✓ Test 2.3 Passed: Theme color palettes (parchment, void, emerald) verified');

  // Test 4: renderToCanvas Execution
  engine.renderToCanvas(canvas, {
    seed: 123,
    preset: 'pangaea',
    theme: 'parchment'
  });
  console.log('✓ Test 2.4 Passed: Canvas rendering execution completed without errors');

  // Test 5: exportToBlob Async Resolution
  const blob = await engine.exportToBlob(canvas);
  if (!blob) {
    throw new Error('FAILED: exportToBlob returned empty result');
  }
  console.log('✓ Test 2.5 Passed: PNG Blob export verified');

  dom.window.close();
  console.log('--- ALL TASK 2 TESTS PASSED ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err.message);
  process.exit(1);
});
