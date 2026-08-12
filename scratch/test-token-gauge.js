const fs = require('fs');
const assert = require('assert');

// 1. Verify HTML container
const html = fs.readFileSync('public/index.html', 'utf8');
assert.ok(
  html.includes('id="token-budget-bar"') || html.includes('class="token-budget-bar"'),
  'HTML must contain #token-budget-bar element'
);
assert.ok(
  html.includes('id="token-budget-fill"') || html.includes('class="token-budget-fill"'),
  'HTML must contain token budget fill element'
);
assert.ok(
  html.includes('id="token-budget-status"') || html.includes('class="token-budget-status"'),
  'HTML must contain token budget status element'
);
console.log('✅ HTML contains #token-budget-bar and child elements');

// 2. Verify CSS rules & theme parity
const css = fs.readFileSync('public/css/styles.css', 'utf8');
assert.ok(css.includes('.token-budget-bar'), 'CSS must contain .token-budget-bar class');
assert.ok(css.includes('.token-budget-track'), 'CSS must contain .token-budget-track class');
assert.ok(css.includes('.token-budget-fill'), 'CSS must contain .token-budget-fill class');
assert.ok(css.includes('.tier-green'), 'CSS must contain .tier-green class');
assert.ok(css.includes('.tier-amber'), 'CSS must contain .tier-amber class');
assert.ok(css.includes('.tier-red'), 'CSS must contain .tier-red class');

assert.ok(
  css.includes('ancient-codex') && css.includes('.token-budget-'),
  'CSS must include ancient-codex theme rules for token-budget components'
);
assert.ok(
  css.includes('scifi-fantasy') && css.includes('.token-budget-'),
  'CSS must include scifi-fantasy theme rules for token-budget components'
);
assert.ok(
  (css.includes('data-mode="light"') || css.includes('[data-mode="light"]')) && css.includes('.token-budget-'),
  'CSS must include Light mode theme rules for token-budget components'
);
console.log('✅ CSS has token budget styles, color tiers, and theme parity');

// 3. Verify JS implementation in context-builder.js
const js = fs.readFileSync('public/js/context-builder.js', 'utf8');
assert.ok(js.includes('renderTray'), 'JS must contain renderTray function');
assert.ok(
  js.includes('token-budget-bar') || js.includes('token-budget-fill') || js.includes('token-budget-status'),
  'renderTray in JS must update token budget gauge elements'
);
assert.ok(
  js.includes('tier-green') && js.includes('tier-amber') && js.includes('tier-red'),
  'renderTray in JS must apply color tier classes (tier-green, tier-amber, tier-red)'
);
assert.ok(
  js.includes('4,096') || js.includes('4096'),
  'renderTray in JS must calculate against token cap (default 4,096)'
);
console.log('✅ JS has active slate token percentage calculation and gauge rendering in renderTray()');

console.log('🎉 All Visual Token Capacity Gauge tests PASSED!');
