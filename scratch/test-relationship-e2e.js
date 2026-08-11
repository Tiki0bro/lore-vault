const http = require('http');

async function testFullFlow() {
  console.log('Running End-to-End Relationship Matrix Verification...');
  
  // 1. Fetch relationships
  const req1 = await makeReq('/api/worlds/default/relationships');
  if (req1.status !== 200) throw new Error('GET relationships failed');

  // 2. Insert test relationship
  const req2 = await makeReq('/api/relationships', 'POST', {
    world_id: 'default',
    source_entity_title: 'House Blackwood',
    target_entity_title: 'The Iron Guard',
    relationship_type: 'hostile',
    sentiment_score: -80,
    summary: 'E2E Test Relationship',
    is_secret: 0
  });
  if (req2.status !== 200) throw new Error('POST relationship failed');

  // 3. Verify insertion
  const req3 = await makeReq('/api/worlds/default/relationships');
  const found = req3.data.relationships.find(r => r.source_entity_title === 'House Blackwood');
  if (!found) throw new Error('Inserted relationship not found in GET response');

  console.log('✅ End-to-End Verification Passed Successfully!');
}

function makeReq(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

testFullFlow().catch(err => {
  console.error('❌ E2E Test Failed:', err.message);
  process.exit(1);
});
