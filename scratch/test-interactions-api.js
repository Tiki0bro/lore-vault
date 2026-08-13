const fs = require('fs');
const path = require('path');

async function testInteractionsAPI() {
  const configPath = path.join(__dirname, '..', 'config', 'ai-config.json');
  let apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      apiKey = cfg.apiKey || '';
    } catch (e) {}
  }

  console.log('=== Testing Google Interactions API Endpoint ===');
  console.log('API Key Present:', !!apiKey);
  if (!apiKey) return;

  const modelsToTest = [
    'gemini-3.1-flash-image',
    'nano-banana-pro-preview',
    'gemini-3-pro-image'
  ];

  const promptText = 'High resolution regional fantasy map, vintage sepia parchment paper, hand-inked cartography, high quality, no text labels.';

  for (const model of modelsToTest) {
    console.log(`\n--- Testing Model: ${model} via /v1beta/interactions ---`);
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: [
            { type: 'text', text: promptText }
          ]
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Response Snippet (${text.length} bytes):`, text.substring(0, 600));

      if (res.ok) {
        try {
          const data = JSON.parse(text);
          console.log('Interactions API Response Keys:', Object.keys(data));
        } catch (e) {}
      }
    } catch (err) {
      console.error(`Fetch Error on ${model}:`, err.message);
    }
  }
}

testInteractionsAPI().then(() => process.exit(0));
