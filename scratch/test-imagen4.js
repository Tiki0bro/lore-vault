const fs = require('fs');
const path = require('path');

async function testImagen4() {
  const configPath = path.join(__dirname, '..', 'config', 'ai-config.json');
  let apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      apiKey = cfg.apiKey || '';
    } catch (e) {}
  }

  console.log('=== Testing Imagen 4.0 API Models ===');
  const modelsToTest = [
    'imagen-4.0-fast-generate-001',
    'imagen-4.0-generate-001',
    'gemini-2.5-flash-image'
  ];

  const promptText = 'High resolution regional fantasy map, vintage sepia parchment paper, hand-inked cartography, high quality, no text labels.';

  for (const model of modelsToTest) {
    console.log(`\n--- Testing Model: ${model} ---`);
    try {
      let endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${apiKey}`;
      let bodyData = {
        prompt: promptText,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9'
        }
      };

      if (model.includes('flash-image')) {
        endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        bodyData = {
          contents: [{ parts: [{ text: promptText }] }]
        };
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ SUCCESS with ${model}! Response keys:`, Object.keys(data));
        if (data.generatedImages && data.generatedImages[0]) {
          console.log(`Got generated image bytes! Length: ${data.generatedImages[0].image.imageBytes.length}`);
          const imgBuffer = Buffer.from(data.generatedImages[0].image.imageBytes, 'base64');
          fs.writeFileSync(path.join(__dirname, 'test-ai-map.png'), imgBuffer);
          console.log('Saved test image to scratch/test-ai-map.png!');
          return model;
        } else if (data.candidates && data.candidates[0]) {
          console.log('Got content candidate:', JSON.stringify(data.candidates[0]).substring(0, 300));
        }
      } else {
        console.log(`Error Response from ${model}:`, JSON.stringify(data));
      }
    } catch (err) {
      console.error(`Error testing ${model}:`, err.message);
    }
  }
}

testImagen4().then((workingModel) => {
  console.log('\n=== TEST COMPLETE. Working Model:', workingModel || 'None', '===');
  process.exit(0);
});
