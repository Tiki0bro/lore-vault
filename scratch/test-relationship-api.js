const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    // 1. GET relationships (World test)
    const res = await makeRequest('/api/worlds/default/relationships');
    if (res.status !== 200) {
      console.error('Test Failed: Expected status 200, got', res.status);
      process.exit(1);
    }

    if (!res.data || !Array.isArray(res.data.relationships)) {
      console.error('Test Failed: Response missing relationships array');
      process.exit(1);
    }
    console.log('Test Passed: GET /api/worlds/default/relationships returned status 200');

    // 2. POST a public relationship
    const postRes = await makeRequest('/api/relationships', 'POST', {
      world_id: 'default',
      source_entity_title: 'Test Source Alpha',
      target_entity_title: 'Test Target Beta',
      relationship_type: 'ally',
      sentiment_score: 5,
      summary: 'Public alliance',
      is_secret: false
    });
    if (postRes.status !== 200 || !postRes.data.success) {
      console.error('Test Failed: POST /api/relationships failed', postRes);
      process.exit(1);
    }
    const createdId = postRes.data.id;
    console.log('Test Passed: POST /api/relationships created ID', createdId);

    // 3. POST a secret relationship
    const secretPostRes = await makeRequest('/api/relationships', 'POST', {
      world_id: 'default',
      source_entity_title: 'Test Source Secret',
      target_entity_title: 'Test Target Secret',
      relationship_type: 'enemy',
      sentiment_score: -5,
      summary: 'Secret rival',
      is_secret: true
    });
    if (secretPostRes.status !== 200 || !secretPostRes.data.success) {
      console.error('Test Failed: POST secret relationship failed', secretPostRes);
      process.exit(1);
    }
    const secretId = secretPostRes.data.id;
    console.log('Test Passed: POST secret relationship created ID', secretId);

    // 4. Test DM Mode vs Player Mode filtering
    const dmRes = await makeRequest('/api/worlds/default/relationships');
    const playerRes = await makeRequest('/api/worlds/default/relationships?mode=player');

    const dmSecret = dmRes.data.relationships.find(r => r.id === secretId || r.source_entity_title === 'Test Source Secret');
    const playerSecret = playerRes.data.relationships.find(r => r.id === secretId || r.source_entity_title === 'Test Source Secret');

    if (!dmSecret) {
      console.error('Test Failed: DM mode should include secret relationship');
      process.exit(1);
    }
    if (playerSecret) {
      console.error('Test Failed: Player mode should NOT include secret relationship');
      process.exit(1);
    }
    console.log('Test Passed: Player mode correctly filtered out secret relationship');

    // 5. DELETE created relationships
    const del1 = await makeRequest(`/api/relationships/${createdId}`, 'DELETE');
    const del2 = await makeRequest(`/api/relationships/${secretId}`, 'DELETE');
    if (del1.status !== 200 || del2.status !== 200) {
      console.error('Test Failed: DELETE /api/relationships/:id failed');
      process.exit(1);
    }
    console.log('Test Passed: DELETE /api/relationships/:id succeeded');

    console.log('ALL API INTEGRATION TESTS PASSED!');
    process.exit(0);
  } catch (e) {
    console.error('Test Failed:', e.message);
    process.exit(1);
  }
}

run();
