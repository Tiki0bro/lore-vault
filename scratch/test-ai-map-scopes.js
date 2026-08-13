const fs = require('fs');
const path = require('path');
const http = require('http');

async function runTests() {
  console.log('--- Testing AI Map Scope & Style Calibration ---');

  const { app } = require('../server');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Test 1: Generate Battlemap Scope Map and verify scale_unit is 'feet'
    const formDataBoundary = '--------------------------' + Date.now().toString(16);
    const dummyImage = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2d0b0000000049454e44ae426082', 'hex');

    let bodyParts = [];
    bodyParts.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="world_id"\r\n\r\ndefault\r\n`));
    bodyParts.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest Dungeon Battlemap\r\n`));
    bodyParts.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="map_scope"\r\n\r\nbattlemap\r\n`));
    bodyParts.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="map_style"\r\n\r\ngrimdark\r\n`));
    bodyParts.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="image"; filename="battlemap.png"\r\nContent-Type: image/png\r\n\r\n`));
    bodyParts.push(dummyImage);
    bodyParts.push(Buffer.from(`\r\n--${formDataBoundary}--\r\n`));

    const fullBody = Buffer.concat(bodyParts);

    const res = await fetch(`${baseUrl}/api/maps/generate/procedural`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`
      },
      body: fullBody
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.map) {
      throw new Error('Battlemap generation failed: ' + JSON.stringify(data));
    }

    if (data.map.scale_unit !== 'feet' || data.map.scale_distance !== 5) {
      throw new Error(`Scale calibration failed. Expected feet & 5, got unit: ${data.map.scale_unit}, dist: ${data.map.scale_distance}`);
    }
    console.log('✓ Test 3.1 Passed: Battlemap scope calibrated scale_unit to feet (5ft)');

    // Test 2: Generate World Map Scope and verify scale_unit is 'miles'
    let bodyParts2 = [];
    bodyParts2.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="world_id"\r\n\r\ndefault\r\n`));
    bodyParts2.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest World Atlas\r\n`));
    bodyParts2.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="map_scope"\r\n\r\nworld\r\n`));
    bodyParts2.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="map_style"\r\n\r\nsepia\r\n`));
    bodyParts2.push(Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="image"; filename="worldmap.png"\r\nContent-Type: image/png\r\n\r\n`));
    bodyParts2.push(dummyImage);
    bodyParts2.push(Buffer.from(`\r\n--${formDataBoundary}--\r\n`));

    const res2 = await fetch(`${baseUrl}/api/maps/generate/procedural`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`
      },
      body: Buffer.concat(bodyParts2)
    });

    const data2 = await res2.json();
    if (!res2.ok || !data2.success || !data2.map) {
      throw new Error('World map generation failed: ' + JSON.stringify(data2));
    }

    if (data2.map.scale_unit !== 'miles' || data2.map.scale_distance !== 100) {
      throw new Error(`World map scale calibration failed. Expected miles & 100, got unit: ${data2.map.scale_unit}, dist: ${data2.map.scale_distance}`);
    }
    console.log('✓ Test 3.2 Passed: World map scope calibrated scale_unit to miles (100mi)');

    console.log('=== ALL AI MAP SCOPE TESTS PASSED CLEANLY! ===');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
