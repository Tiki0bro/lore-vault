const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Dual Sharing Engine Endpoints...');
  
  const server = app.listen(3003);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3003${path}`, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        });
      });
      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 1. Live share route
    const res1 = await request('/view/default');
    assert.strictEqual(res1.status, 200, `GET /view/default should return 200 HTML page, got ${res1.status}`);
    assert(res1.body.includes('<meta property="og:title"'), 'Page must contain OpenGraph meta tags');

    // 2. Standalone export endpoint
    const res2 = await request('/api/export/atlas/default', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ mode: 'player' }));
    assert.strictEqual(res2.status, 200, `POST /api/export/atlas/default should return 200 HTML, got ${res2.status}`);
    assert(res2.body.includes('<!DOCTYPE html>'), 'Exporter must return standalone HTML');

    console.log('✅ Dual Sharing Engine Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
