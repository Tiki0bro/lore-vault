const fs = require('fs');
const path = require('path');

async function listModels() {
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

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    if (data.models) {
      console.log('Available Models:', data.models.map(m => m.name));
    } else {
      console.log('Response:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

listModels().then(() => process.exit(0));
