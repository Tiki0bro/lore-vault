const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing World Frontpage API Endpoints...');
  const server = app.listen(3004);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3004${path}`, options, (res) => {
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
    // 1. Fetch frontpage payload for default world
    const res1 = await request('/api/worlds/default/frontpage');
    assert.strictEqual(res1.status, 200, `GET /api/worlds/default/frontpage should return 200, got ${res1.status}`);
    assert(res1.body.world, 'Response should contain world object');
    assert(Array.isArray(res1.body.pinnedArticles), 'Response should contain pinnedArticles array');

    // 2. Update frontpage payload
    const updatePayload = {
      tagline: 'A world of ancient high magic and floating citadels.',
      template_style: 'grand-codex'
    };
    const res2 = await request('/api/worlds/default/frontpage', { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, updatePayload);
    assert.strictEqual(res2.status, 200, `PUT /api/worlds/default/frontpage should return 200, got ${res2.status}`);
    assert.strictEqual(res2.body.world.tagline, 'A world of ancient high magic and floating citadels.');

    console.log('✅ Frontpage Backend Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
