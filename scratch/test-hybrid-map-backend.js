const fs = require('fs');
const path = require('path');
const http = require('http');
const { app, db } = require('../server.js');

async function testBackendEndpoints() {
  console.log('--- Task 1 Backend Endpoint Verification ---');

  let server;
  let port;

  // Start test server on an ephemeral free port to avoid conflicts with background process
  await new Promise((resolve, reject) => {
    server = app.listen(0, () => {
      port = server.address().port;
      console.log(`Test server running on dynamic port ${port}`);
      resolve();
    });
    server.on('error', reject);
  });

  const cleanup = () => {
    if (server) server.close();
  };

  try {
    // 1. Verify POST /api/maps/generate/procedural with multipart image blob upload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2d0b0000000049454e44ae426082', 'hex');

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="world_id"\r\n\r\ndefault\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nTest Procedural Realm\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="preset"\r\n\r\npangaea\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="theme"\r\n\r\nparchment\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="image"; filename="generated-map.png"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      dummyPng,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    const res1 = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/maps/generate/procedural',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: data }));
      });
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });

    if (res1.status !== 201) {
      cleanup();
      console.error('FAILED: Procedural endpoint status expected 201, got', res1.status, res1.data);
      process.exit(1);
    }

    const json1 = JSON.parse(res1.data);
    if (!json1.success || !json1.map || !json1.map.image_path || !Array.isArray(json1.pins)) {
      cleanup();
      console.error('FAILED: Invalid procedural response payload:', json1);
      process.exit(1);
    }

    if (!json1.map.image_path.startsWith('/uploads/images/')) {
      cleanup();
      console.error('FAILED: Image path does not start with /uploads/images/:', json1.map.image_path);
      process.exit(1);
    }

    console.log('✓ Test 1.1 Passed: Procedural map endpoint uploaded image blob & created map record:', json1.map.image_path);

    // 2. Verify POST /api/maps/generate/ai
    const res2 = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/maps/generate/ai',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: data }));
      });
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });

    if (res2.status !== 201) {
      cleanup();
      console.error('FAILED: AI endpoint status expected 201, got', res2.status, res2.data);
      process.exit(1);
    }

    const json2 = JSON.parse(res2.data);
    if (!json2.success || !json2.map) {
      cleanup();
      console.error('FAILED: Invalid AI response payload:', json2);
      process.exit(1);
    }

    console.log('✓ Test 1.2 Passed: AI map generation endpoint verified:', json2.map.image_path);

    cleanup();
    console.log('--- ALL TASK 1 TESTS PASSED ---');
    process.exit(0);

  } catch (err) {
    cleanup();
    console.error('FAILED: Task 1 test exception:', err);
    process.exit(1);
  }
}

testBackendEndpoints();
