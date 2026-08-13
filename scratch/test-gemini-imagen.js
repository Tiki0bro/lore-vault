const fs = require('fs');
const path = require('path');

async function testGeminiAPI() {
  const configPath = path.join(__dirname, '..', 'config', 'ai-config.json');
  let apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      apiKey = cfg.apiKey || '';
    } catch (e) {}
  }

  console.log('=== Checking Gemini API Key Configuration ===');
  console.log('API Key Config Path:', configPath);
  console.log('API Key Present:', !!apiKey);
  if (apiKey) {
    console.log('API Key Value:', apiKey.substring(0, 8) + '... (Length: ' + apiKey.length + ')');
  } else {
    console.log('❌ NO GEMINI_API_KEY found in process.env or config/ai-config.json!');
    return;
  }

  const promptText = 'High resolution regional fantasy map, vintage sepia parchment paper, hand-inked cartography, high quality, no text labels.';

  console.log('\n--- Querying Google Imagen 3 API ---');
  try {
    const imagenRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9'
        }
      })
    });

    console.log('HTTP Response Status:', imagenRes.status, imagenRes.statusText);
    const text = await imagenRes.text();
    console.log('HTTP Response Body:', text.substring(0, 500));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

testGeminiAPI().then(() => process.exit(0));
