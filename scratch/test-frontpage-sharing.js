const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Public World Frontpage Share Gateway...');
  const server = app.listen(3005);

  function request(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3005${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });
  }

  try {
    const res = await request('/view/default');
    assert.strictEqual(res.status, 200, 'GET /view/default should return 200');
    assert(res.body.includes('class="world-hero-banner"'), 'Page must contain world hero banner section');
    assert(res.body.includes('class="featured-spotlight-grid"'), 'Page must contain featured spotlight grid');
    assert(res.body.includes('<meta property="og:title"'), 'Page must contain OpenGraph title tag');

    console.log('✅ Frontpage Share Gateway Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
