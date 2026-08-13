const fs = require('fs');
const path = require('path');

async function testImagenEndpoints() {
  const configPath = path.join(__dirname, '..', 'config', 'ai-config.json');
  let apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      apiKey = cfg.apiKey || '';
    } catch (e) {}
  }

  console.log('API Key Present:', !!apiKey);
  if (!apiKey) return;

  const endpoints = [
    {
      name: 'imagen-3.0-generate-002:generateImages',
      url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`,
      body: { prompt: 'High resolution fantasy regional map', config: { numberOfImages: 1, outputMimeType: 'image/png' } }
    },
    {
      name: 'imagen-3.0-fast-generate-001:generateImages',
      url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:generateImages?key=${apiKey}`,
      body: { prompt: 'High resolution fantasy regional map', config: { numberOfImages: 1, outputMimeType: 'image/png' } }
    },
    {
      name: 'gemini-2.0-flash:generateContent (B64 Image Request)',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      body: {
        contents: [{
          parts: [{ text: 'Generate an intricate fantasy cartography regional map image.' }]
        }]
      }
    }
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting ${ep.name}...`);
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body)
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Response Snippet:`, text.substring(0, 300));
    } catch (err) {
      console.error(`Fetch Error:`, err.message);
    }
  }
}

testImagenEndpoints().then(() => process.exit(0));
