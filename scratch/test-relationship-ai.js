const http = require('http');

function makeRequest(path, method = 'POST', data = {}) {
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
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    const res = await makeRequest('/api/relationships/spark-conflict', 'POST', {
      world_id: 'default',
      source_entity_title: 'House Blackwood',
      target_entity_title: 'The Iron Guard'
    });
    if (res.status !== 200) {
      console.error('Test Failed: Expected 200, got', res.status);
      process.exit(1);
    }
    console.log('Test Passed: AI Conflict endpoint returned status 200');

    const resExtract = await makeRequest('/api/relationships/auto-extract', 'POST', {
      world_id: 'default'
    });
    if (resExtract.status !== 200) {
      console.error('Test Failed: Expected 200 for auto-extract, got', resExtract.status);
      process.exit(1);
    }
    console.log('Test Passed: AI Auto-Extract endpoint returned status 200');

    process.exit(0);
  } catch (e) {
    console.error('Test Failed:', e.message);
    process.exit(1);
  }
}
run();
