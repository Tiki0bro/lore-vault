const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Dual-Engine Cartographer API Endpoints...');
  const server = app.listen(3006);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3006${path}`, options, (res) => {
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
    // 1. Test Procedural Map Generation
    const res1 = await request('/api/maps/auto-generate/procedural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ world_id: 'default', title: 'Procedural Test Map' }));

    assert.strictEqual(res1.status, 201, `POST /api/maps/auto-generate/procedural should return 201, got ${res1.status}`);
    assert(res1.body.map, 'Response should return map object');
    assert(Array.isArray(res1.body.pins), 'Response should return auto-placed pins array');

    // 2. Verify Force-Directed & Biome Separation
    const pins = res1.body.pins;
    if (pins.length >= 2) {
      const dx = pins[0].x_pct - pins[1].x_pct;
      const dy = pins[0].y_pct - pins[1].y_pct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert(dist > 0.01, `Pins must not overlap! Distance was ${dist}`);
    }

    console.log('✅ Dual-Engine Cartographer Backend Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
