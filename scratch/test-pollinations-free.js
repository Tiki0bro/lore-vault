const fs = require('fs');
const path = require('path');

async function testPollinationsFree() {
  console.log('=== Testing Free Pollinations AI Endpoint (image.pollinations.ai) ===');

  const promptText = encodeURIComponent('high resolution fantasy map, regional continent, vintage sepia parchment paper, hand inked cartography, high quality');
  const imageUrl = `https://image.pollinations.ai/prompt/${promptText}?width=1920&height=1080&seed=12345&model=flux&nologo=true`;

  console.log('Fetching image from Pollinations Free URL:', imageUrl);

  try {
    const res = await fetch(imageUrl);
    console.log('Response Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log('Image Bytes Received:', buffer.length);
      const savePath = path.join(__dirname, 'test-pollinations-map.jpg');
      fs.writeFileSync(savePath, buffer);
      console.log('Saved test image to scratch/test-pollinations-map.jpg!');
      return true;
    } else {
      const errText = await res.text();
      console.log('Error Response:', errText);
    }
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
  return false;
}

testPollinationsFree().then(success => console.log('Free Pollinations Test Success:', success));
