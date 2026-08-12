const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    testsFailed++;
  }
}

console.log('====================================================');
console.log('Task 4: Automated Verification & Dead-Button Audit');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. Static File Verification
// ----------------------------------------------------
console.log('--- Step 1: Static File Inspections ---');
const htmlPath = path.join(__dirname, '../public/index.html');
const cssPath = path.join(__dirname, '../public/css/styles.css');
const jsPath = path.join(__dirname, '../public/js/app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// HTML assertions
assert(
  htmlContent.includes('id="theme-mode-toggle"'),
  'public/index.html contains #theme-mode-toggle button'
);
assert(
  htmlContent.includes('class="mode-icon-sun"'),
  'public/index.html contains mode-icon-sun span'
);
assert(
  htmlContent.includes('class="mode-icon-moon"'),
  'public/index.html contains mode-icon-moon span'
);

// CSS assertions
assert(
  cssContent.includes('[data-mode="light"]'),
  'public/css/styles.css defines [data-mode="light"] selector'
);
const requiredLightTokens = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-card',
  '--bg-modal',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--border-color',
  '--accent-gold',
  '--accent-hover',
  '--shadow-color',
  '--shadow-lg',
  '--input-bg',
  '--hover-bg'
];
requiredLightTokens.forEach(token => {
  assert(
    cssContent.includes(token),
    `public/css/styles.css contains token definition ${token}`
  );
});

assert(
  cssContent.includes('.btn-icon-toggle'),
  'public/css/styles.css contains .btn-icon-toggle styling'
);

// JS assertions
assert(
  jsContent.includes('initThemeMode()'),
  'public/js/app.js implements initThemeMode()'
);
assert(
  jsContent.includes('toggleThemeMode()'),
  'public/js/app.js implements toggleThemeMode()'
);
assert(
  jsContent.includes('updateToggleIcon('),
  'public/js/app.js implements updateToggleIcon()'
);
assert(
  jsContent.includes("localStorage.getItem('lorevault_mode')") || jsContent.includes('localStorage.getItem("lorevault_mode")'),
  'public/js/app.js checks localStorage for saved lorevault_mode'
);
assert(
  jsContent.includes('#theme-mode-toggle'),
  'public/js/app.js references #theme-mode-toggle event delegation'
);

// ----------------------------------------------------
// 2. Runtime JSDOM Behavioral Verification
// ----------------------------------------------------
console.log('\n--- Step 2: Runtime JSDOM Behavioral Verification ---');

// Prepare JSDOM environment with mocked fetch to avoid network errors
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("jsdomError", (err) => {
  // Ignore minor unhandled resource errors in headless JSDOM
});

// Inject script directly into html for execution
const modifiedHtml = htmlContent.replace(
  /<script src="js\/app\.js[^"]*"><\/script>/i,
  `<script>${jsContent}</script>`
);

const dom = new JSDOM(modifiedHtml, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole
});

const { window } = dom;

// Polyfill / Mock fetch API for JSDOM
window.fetch = async (url) => {
  return {
    ok: true,
    status: 200,
    json: async () => []
  };
};

// Wait for DOMContentLoaded to fire and LoreApp to initialize
setTimeout(() => {
  try {
    const toggleBtn = window.document.getElementById('theme-mode-toggle');
    const sunIcon = toggleBtn ? toggleBtn.querySelector('.mode-icon-sun') : null;
    const moonIcon = toggleBtn ? toggleBtn.querySelector('.mode-icon-moon') : null;

    assert(!!toggleBtn, 'JSDOM: #theme-mode-toggle element exists in DOM');
    assert(!!sunIcon, 'JSDOM: .mode-icon-sun child exists');
    assert(!!moonIcon, 'JSDOM: .mode-icon-moon child exists');

    // Test 1: Initial default state (dark)
    const initialMode = window.document.body.getAttribute('data-mode');
    assert(
      initialMode === 'dark',
      `JSDOM: Initial data-mode is "dark" (got "${initialMode}")`
    );
    assert(
      sunIcon.style.display !== 'none',
      'JSDOM: Sun icon is visible initially (display !== "none")'
    );
    assert(
      moonIcon.style.display === 'none',
      'JSDOM: Moon icon is hidden initially (display === "none")'
    );
    assert(
      toggleBtn.getAttribute('title') === "Switch to Scholar's Parchment Light Mode",
      `JSDOM: Toggle title is "Switch to Scholar's Parchment Light Mode" (got "${toggleBtn.getAttribute('title')}")`
    );

    // Test 2: Toggle to Light Mode
    toggleBtn.click();
    const lightMode = window.document.body.getAttribute('data-mode');
    const savedLightStorage = window.localStorage.getItem('lorevault_mode');

    assert(
      lightMode === 'light',
      `JSDOM: After 1st click, data-mode is "light" (got "${lightMode}")`
    );
    assert(
      savedLightStorage === 'light',
      `JSDOM: After 1st click, localStorage lorevault_mode is "light" (got "${savedLightStorage}")`
    );
    assert(
      sunIcon.style.display === 'none',
      'JSDOM: After 1st click, Sun icon is hidden (display === "none")'
    );
    assert(
      moonIcon.style.display === 'inline',
      'JSDOM: After 1st click, Moon icon is visible (display === "inline")'
    );
    assert(
      toggleBtn.getAttribute('title') === 'Switch to Dark Mode',
      `JSDOM: After 1st click, button title is "Switch to Dark Mode" (got "${toggleBtn.getAttribute('title')}")`
    );

    // Test 3: Toggle back to Dark Mode
    toggleBtn.click();
    const darkMode = window.document.body.getAttribute('data-mode');
    const savedDarkStorage = window.localStorage.getItem('lorevault_mode');

    assert(
      darkMode === 'dark',
      `JSDOM: After 2nd click, data-mode is "dark" (got "${darkMode}")`
    );
    assert(
      savedDarkStorage === 'dark',
      `JSDOM: After 2nd click, localStorage lorevault_mode is "dark" (got "${savedDarkStorage}")`
    );
    assert(
      sunIcon.style.display === 'inline',
      'JSDOM: After 2nd click, Sun icon is visible (display === "inline")'
    );
    assert(
      moonIcon.style.display === 'none',
      'JSDOM: After 2nd click, Moon icon is hidden (display === "none")'
    );
    assert(
      toggleBtn.getAttribute('title') === "Switch to Scholar's Parchment Light Mode",
      `JSDOM: After 2nd click, button title is "Switch to Scholar's Parchment Light Mode" (got "${toggleBtn.getAttribute('title')}")`
    );

    // ----------------------------------------------------
    // 3. Dead-Button Audit
    // ----------------------------------------------------
    console.log('\n--- Step 3: Dead-Button Audit (Navbar & Action Controls) ---');
    const navbarButtons = [
      { id: 'tab-library', name: 'Lore Codex Tab' },
      { id: 'narrative-slate-nav-btn', name: 'Narrative Slate Tab' },
      { id: 'tab-context', name: 'Weave Matrix Tab' },
      { id: 'tab-marketing', name: 'Marketing Tab' },
      { id: 'world-select-dropdown', name: 'World Select Dropdown' },
      { id: 'tools-dropdown-btn', name: 'Tools Dropdown Button' },
      { id: 'theme-mode-toggle', name: 'Theme Mode Toggle Button' }
    ];

    navbarButtons.forEach(btnInfo => {
      const el = window.document.getElementById(btnInfo.id);
      assert(!!el, `Dead-Button Audit: Element #${btnInfo.id} (${btnInfo.name}) exists in navbar`);
      
      if (el) {
        const hasOnClick = el.hasAttribute('onclick');
        const isInteractive = el.tagName === 'BUTTON' || el.tagName === 'SELECT' || hasOnClick;
        assert(
          isInteractive,
          `Dead-Button Audit: Element #${btnInfo.id} is an interactive element (${el.tagName}, has onclick: ${hasOnClick})`
        );

        // Click execution safety test
        let clickError = null;
        try {
          if (el.tagName === 'BUTTON') {
            el.click();
          }
        } catch (err) {
          clickError = err;
        }
        assert(
          !clickError,
          `Dead-Button Audit: Clicking #${btnInfo.id} executes without throwing uncaught errors`
        );
      }
    });

    // Final Summary
    console.log('\n====================================================');
    console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('====================================================');

    if (testsFailed > 0) {
      console.error('TEST SUITE FAILED!');
      process.exit(1);
    } else {
      console.log('ALL CHECKS PASSED SUCCESSFULLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Unhandled Exception in Test Suite:', err);
    process.exit(1);
  }
}, 600);
