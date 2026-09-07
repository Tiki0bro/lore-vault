const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ParticleBannerManager } = require('../public/js/particle-banner.js');

describe('UI Modernization & Aesthetic Suite Tests', () => {

  test('ParticleBannerManager initializes and handles theme switching cleanly', () => {
    const banner = new ParticleBannerManager();
    assert.strictEqual(banner.theme, 'radiant-arcane');
    assert.strictEqual(banner.particles.length, 0);

    // Mock mini context & canvas
    banner.canvas = { width: 800, height: 120 };
    banner.ctx = {
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {}
    };

    banner.spawnParticles();
    assert.strictEqual(banner.particles.length, 35);
    assert.ok(banner.particles[0].speedY < 0, 'Arcane particles float upward');

    banner.setTheme('grimdark-iron');
    assert.strictEqual(banner.theme, 'grimdark-iron');
    assert.strictEqual(banner.particles.length, 35);
    assert.ok(banner.particles[0].speedY > 0, 'Grimdark particles fall downward');
  });

  test('styles.css contains Radiant Arcane, Grimdark Iron, micro-animations, and reduced-motion overrides', () => {
    const cssPath = path.join(__dirname, '../public/css/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('[data-theme="radiant-arcane"]'), 'styles.css has radiant-arcane theme matrix');
    assert.ok(cssContent.includes('[data-theme="grimdark-iron"]'), 'styles.css has grimdark-iron theme matrix');
    assert.ok(cssContent.includes('@keyframes modalSpringIn'), 'styles.css has spring modal animation');
    assert.ok(cssContent.includes('.particle-banner-container'), 'styles.css has particle banner wrapper CSS');
    assert.ok(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'styles.css has reduced-motion override');
  });

  test('index.html includes particle-banner.js script tag and preset options', () => {
    const htmlPath = path.join(__dirname, '../public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(htmlContent.includes('js/particle-banner.js'), 'index.html includes particle-banner.js script tag');
    assert.ok(htmlContent.includes('radiant-arcane'), 'index.html includes radiant-arcane theme option');
    assert.ok(htmlContent.includes('grimdark-iron'), 'index.html includes grimdark-iron theme option');
    assert.ok(htmlContent.includes("applyThemePreset('radiant_arcane')"), 'index.html includes radiant_arcane preset button');
  });

});
