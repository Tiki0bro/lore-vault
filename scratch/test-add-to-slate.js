/**
 * test-add-to-slate.js
 * Component Test: "Add to Scene Slate" Reader Action Button
 *
 * Validates:
 * 1. HTML: #add-to-slate-btn exists with correct class/title
 * 2. CSS: .add-to-slate-btn base, hover, active, disabled rules + @keyframes slate-pulse
 * 3. CSS: Theme variants (ancient-codex, scifi-fantasy, light mode)
 * 4. JS (app.js): handleAddToSlateClick method + syncAddToSlateBtn method + event delegation
 * 5. JS (context-builder.js): addArticleToSlate method exposed, triggers renderTray
 */

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');
const cbJs = fs.readFileSync('public/js/context-builder.js', 'utf8');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
    console.error(`          ${err.message}`);
  }
}

console.log('\n🧪 TEST SUITE: Add to Scene Slate Reader Action Button\n');

// ── HTML TESTS ──────────────────────────────────────────────────────────────
console.log('📄 HTML Assertions:');

test('HTML contains #add-to-slate-btn element', () => {
  assert.ok(html.includes('id="add-to-slate-btn"'), 'Missing #add-to-slate-btn in index.html');
});

test('Button has .add-to-slate-btn class', () => {
  assert.ok(html.includes('class="add-to-slate-btn'), 'Missing .add-to-slate-btn class');
});

test('Button has title="Add to Scene Slate"', () => {
  assert.ok(html.includes('title="Add to Scene Slate"'), 'Missing title attribute');
});

test('Button text contains "+ Add to Slate"', () => {
  assert.ok(html.includes('+ Add to Slate</button>'), 'Missing button text');
});

test('Button is inside .article-viewer-toolbar', () => {
  const toolbarIdx = html.indexOf('class="article-viewer-toolbar"');
  const btnIdx = html.indexOf('id="add-to-slate-btn"');
  assert.ok(toolbarIdx > 0 && btnIdx > toolbarIdx, 'Button must be inside .article-viewer-toolbar');
});

// ── CSS TESTS ───────────────────────────────────────────────────────────────
console.log('\n🎨 CSS Assertions:');

test('CSS contains .add-to-slate-btn base styles', () => {
  assert.ok(css.includes('.add-to-slate-btn {'), 'Missing .add-to-slate-btn base rule');
  assert.ok(css.includes('.add-to-slate-btn'), 'Missing .add-to-slate-btn selector');
});

test('CSS contains .add-to-slate-btn:hover rule', () => {
  assert.ok(css.includes('.add-to-slate-btn:hover'), 'Missing :hover state');
});

test('CSS contains .add-to-slate-btn:active rule', () => {
  assert.ok(css.includes('.add-to-slate-btn:active'), 'Missing :active state');
});

test('CSS contains .add-to-slate-btn:disabled rule', () => {
  assert.ok(css.includes('.add-to-slate-btn:disabled'), 'Missing :disabled state');
});

test('CSS contains @keyframes slate-pulse animation', () => {
  assert.ok(css.includes('@keyframes slate-pulse'), 'Missing @keyframes slate-pulse');
});

test('CSS contains .slate-pulse-anim class', () => {
  assert.ok(css.includes('.add-to-slate-btn.slate-pulse-anim'), 'Missing .slate-pulse-anim class');
});

test('CSS has ancient-codex theme variant', () => {
  assert.ok(css.includes('[data-theme="ancient-codex"] .add-to-slate-btn'), 'Missing ancient-codex theme');
});

test('CSS has scifi-fantasy theme variant', () => {
  assert.ok(css.includes('[data-theme="scifi-fantasy"] .add-to-slate-btn'), 'Missing scifi-fantasy theme');
});

test('CSS has light mode variant', () => {
  assert.ok(css.includes('[data-mode="light"] .add-to-slate-btn'), 'Missing light mode variant');
});

// ── APP.JS TESTS ────────────────────────────────────────────────────────────
console.log('\n⚡ App.js Assertions:');

test('app.js contains handleAddToSlateClick method', () => {
  assert.ok(appJs.includes('handleAddToSlateClick'), 'Missing handleAddToSlateClick method');
});

test('app.js contains syncAddToSlateBtn method', () => {
  assert.ok(appJs.includes('syncAddToSlateBtn'), 'Missing syncAddToSlateBtn method');
});

test('handleAddToSlateClick calls ContextBuilder.addArticleToSlate', () => {
  assert.ok(appJs.includes('addArticleToSlate'), 'Missing addArticleToSlate call in handler');
});

test('Click handler shows visual feedback (✓ Added)', () => {
  assert.ok(appJs.includes('Added'), 'Missing "Added" text feedback');
});

test('Click handler triggers slate-pulse-anim class', () => {
  assert.ok(appJs.includes('slate-pulse-anim'), 'Missing slate-pulse-anim CSS class toggle');
});

test('syncAddToSlateBtn checks ContextBuilder state', () => {
  assert.ok(appJs.includes('selectedArticleIds.has'), 'syncAddToSlateBtn must check selectedArticleIds');
});

test('Event delegation is registered via document.addEventListener', () => {
  assert.ok(appJs.includes("e.target.id === 'add-to-slate-btn'"), 'Missing event delegation for #add-to-slate-btn');
});

test('loadArticle calls syncAddToSlateBtn', () => {
  assert.ok(appJs.includes('this.syncAddToSlateBtn()'), 'loadArticle must call syncAddToSlateBtn');
});

// ── CONTEXT-BUILDER.JS TESTS ────────────────────────────────────────────────
console.log('\n🔮 Context Builder Assertions:');

test('context-builder.js exposes addArticleToSlate method', () => {
  assert.ok(cbJs.includes('addArticleToSlate(articleId)'), 'Missing addArticleToSlate method');
});

test('addArticleToSlate toggles selectedArticleIds', () => {
  assert.ok(cbJs.includes('this.state.slate.selectedArticleIds.has(articleId)'), 'Must toggle selectedArticleIds');
  assert.ok(cbJs.includes('this.state.slate.selectedArticleIds.add(articleId)'), 'Must add to selectedArticleIds');
  assert.ok(cbJs.includes('this.state.slate.selectedArticleIds.delete(articleId)'), 'Must support delete from selectedArticleIds');
});

test('addArticleToSlate calls renderTray for token gauge update', () => {
  // The method body must call renderTray
  const methodStart = cbJs.indexOf('addArticleToSlate(articleId)');
  const methodEnd = cbJs.indexOf('},', methodStart + 1);
  const methodBody = cbJs.substring(methodStart, methodEnd);
  assert.ok(methodBody.includes('this.renderTray()'), 'addArticleToSlate must call renderTray()');
});

test('addArticleToSlate calls renderSlateBucket', () => {
  const methodStart = cbJs.indexOf('addArticleToSlate(articleId)');
  const methodEnd = cbJs.indexOf('},', methodStart + 1);
  const methodBody = cbJs.substring(methodStart, methodEnd);
  assert.ok(methodBody.includes('this.renderSlateBucket()'), 'addArticleToSlate must call renderSlateBucket()');
});

test('addArticleToSlate calls compileContext', () => {
  const methodStart = cbJs.indexOf('addArticleToSlate(articleId)');
  const methodEnd = cbJs.indexOf('},', methodStart + 1);
  const methodBody = cbJs.substring(methodStart, methodEnd);
  assert.ok(methodBody.includes('this.compileContext()'), 'addArticleToSlate must call compileContext()');
});

test('addArticleToSlate returns boolean (wasAdded)', () => {
  const methodStart = cbJs.indexOf('addArticleToSlate(articleId)');
  const methodEnd = cbJs.indexOf('},', methodStart + 1);
  const methodBody = cbJs.substring(methodStart, methodEnd);
  assert.ok(methodBody.includes('return wasAdded'), 'addArticleToSlate must return wasAdded boolean');
});

// ── SUMMARY ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('─'.repeat(60));

if (failed > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED — 100% GREEN');
  process.exit(0);
}
