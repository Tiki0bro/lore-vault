const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing LoreVault Version 2 Backend API Endpoints...');
  const server = app.listen(3007);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3007${path}`, options, (res) => {
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
    // 1. Create New World
    const resWorld = await request('/api/worlds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ name: 'Aethelgard Version 2', tagline: 'The Second Era' }));

    if (resWorld.status !== 201 && resWorld.status !== 200) {
      console.error('World Create Error:', resWorld.body);
    }
    assert(resWorld.status === 200 || resWorld.status === 201, `POST /api/worlds status got ${resWorld.status}`);
    const worldId = resWorld.body.world.id;
    assert.strictEqual(resWorld.body.world.name, 'Aethelgard Version 2');

    // 2. Create Timeline Event
    const resEv = await request('/api/timeline-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      world_id: worldId,
      title: 'The Great Shattering',
      epoch_name: 'First Age',
      display_year: 'Year 142',
      sort_order: 142,
      summary: 'The continent split during the elder cataclysm.'
    }));

    assert.strictEqual(resEv.status, 201, `POST /api/timeline-events should return 201, got ${resEv.status}`);
    const evId = resEv.body.event.id;

    // 3. Fetch World Timeline
    const resTimeline = await request(`/api/worlds/${worldId}/timeline`);
    assert.strictEqual(resTimeline.status, 200, `GET /api/worlds/:id/timeline should return 200`);
    assert(Array.isArray(resTimeline.body.events), 'Timeline should return events array');
    assert.strictEqual(resTimeline.body.events.length, 1);
    assert.strictEqual(resTimeline.body.events[0].title, 'The Great Shattering');

    // 4. Delete Timeline Event
    const resDelEv = await request(`/api/timeline-events/${evId}`, { method: 'DELETE' });
    assert.strictEqual(resDelEv.status, 200);

    // 5. Delete World
    const resDelWorld = await request(`/api/worlds/${worldId}`, { method: 'DELETE' });
    assert.strictEqual(resDelWorld.status, 200);

    console.log('✅ LoreVault Version 2 Backend Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
