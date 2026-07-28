const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptContent = fs.readFileSync('public/js/app.js', 'utf8');

// Inject the script directly into the HTML to avoid loading issues
const modifiedHtml = html.replace('<script src="js/app.js?v=2"></script>', `<script>${scriptContent}</script>`);

const dom = new JSDOM(modifiedHtml, { runScripts: "dangerously" });

// Wait for DOMContentLoaded to run in JSDOM
setTimeout(() => {
  try {
    const window = dom.window;
    
    // Check if app is initialized
    console.log('Is window.app defined?', !!window.app);
    
    // Simulate clicking the Scene Studio tab
    console.log('Simulating click on Scene Studio tab...');
    window.switchTab('studio');
    
    const studioView = window.document.getElementById('view-studio');
    console.log('view-studio classes:', studioView.className);
    
    const computedStyle = window.getComputedStyle(studioView);
    console.log('view-studio display style:', computedStyle.display);
    
    console.log('Inner HTML snippet:', studioView.innerHTML.substring(0, 100).replace(/\n/g, ' '));
  } catch(e) {
    console.error('Error during test:', e);
  }
}, 500);
