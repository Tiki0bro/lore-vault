const assert = require('assert');
const http = require('http');

// Require server app directly
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Atlas Backend API Endpoints (In-Process Test Server)...');
  
  const server = app.listen(3002);
  
  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3002${path}`, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 1. Fetch maps for default world
    const res1 = await request('/api/worlds/default/maps');
    assert.strictEqual(res1.status, 200, `GET /api/worlds/default/maps should return 200, got ${res1.status}`);
    assert(Array.isArray(res1.body.maps), 'Response should contain maps array');

    // 2. Add map pin endpoint test
    const pinPayload = {
      map_id: 'test-map-1',
      article_id: null,
      x_pct: 0.45,
      y_pct: 0.65,
      label: 'Ancient Citadel Ruins',
      pin_icon: 'fa-fort-awesome',
      pin_color: '#ef4444',
      is_secret: 0
    };
    const res2 = await request('/api/map-pins', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, pinPayload);
    assert.strictEqual(res2.status, 201, `POST /api/map-pins should return 201, got ${res2.status}`);
    assert.strictEqual(res2.body.success, true, 'Pin creation response should return success: true');
    assert.strictEqual(res2.body.pin.label, 'Ancient Citadel Ruins');
    assert.strictEqual(res2.body.pin.x_pct, 0.45);

    console.log('✅ Atlas Backend Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
