const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptContent = fs.readFileSync('public/js/app.js', 'utf8');

const modifiedHtml = html.replace('<script src="js/app.js?v=2"></script>', `<script>${scriptContent}</script>`);

const dom = new JSDOM(modifiedHtml, { runScripts: "dangerously" });

setTimeout(() => {
  const window = dom.window;
  
  // Override switchTab to log
  const originalSwitchTab = window.switchTab;
  window.switchTab = function(tabName) {
    console.log('Calling switchTab for:', tabName);
    console.log('Is window.app defined?', !!window.app);
    console.log('Is window.app.switchTab a function?', typeof window.app?.switchTab === 'function');
    originalSwitchTab(tabName);
  };
  
  window.switchTab('studio');
  
  const studioView = window.document.getElementById('view-studio');
  console.log('view-studio classes:', studioView.className);
}, 500);
