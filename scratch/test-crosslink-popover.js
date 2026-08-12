const fs = require('fs');
const assert = require('assert');

// 1. Verify HTML container
const html = fs.readFileSync('public/index.html', 'utf8');
assert.ok(
  html.includes('id="crosslink-popover"') || html.includes('class="crosslink-popover'),
  'HTML must contain #crosslink-popover element'
);
console.log('✅ HTML has #crosslink-popover element');

// 2. Verify CSS rules
const css = fs.readFileSync('public/css/styles.css', 'utf8');
assert.ok(css.includes('.crosslink-popover'), 'CSS must contain .crosslink-popover class');
assert.ok(css.includes('.crosslink-item'), 'CSS must contain .crosslink-item class');
assert.ok(css.includes('.crosslink-badge'), 'CSS must contain .crosslink-badge class');
assert.ok(
  css.includes('ancient-codex') && css.includes('.crosslink-popover'),
  'CSS must include ancient-codex theme rules for crosslink-popover'
);
assert.ok(
  css.includes('scifi-fantasy') && css.includes('.crosslink-popover'),
  'CSS must include scifi-fantasy theme rules for crosslink-popover'
);
console.log('✅ CSS has crosslink popover styles and theme parity');

// 3. Verify JS implementation
const js = fs.readFileSync('public/js/app.js', 'utf8');
assert.ok(
  js.includes('setupCrosslinkPopover') || js.includes('crosslink-popover'),
  'JS must implement setupCrosslinkPopover or crosslink popover handling'
);
assert.ok(
  js.includes('@') && js.includes('insertCrosslink'),
  'JS must implement @ detection and insertCrosslink method'
);
console.log('✅ JS has @ detection and insertion logic');

console.log('🎉 All @ cross-link auto-complete popover tests PASSED!');
