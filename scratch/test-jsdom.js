const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/index.html', 'utf8');
const script = fs.readFileSync('public/js/app.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "outside-only" });
dom.window.eval(script);

// trigger initialization
dom.window.eval(`
  window.app = new LoreApp();
  window.switchTab('studio');
`);

setTimeout(() => {
  const el = dom.window.document.getElementById('view-studio');
  console.log('view-studio classes:', el.className);
  console.log('view-studio display style:', dom.window.getComputedStyle(el).display);
  
  const studioView = dom.window.document.getElementById('view-studio');
  console.log('outer html:', studioView.outerHTML.slice(0, 150));
}, 500);
