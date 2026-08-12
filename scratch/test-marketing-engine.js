const http = require('http');
const assert = require('assert');
const { app, db } = require('../server.js');

const PORT = 3995;

const server = app.listen(PORT, async () => {
  console.log(`Test marketing engine server running on port ${PORT}...`);

  const testArticleId = `test-article-spoiler-${Date.now()}`;
  const secretText = 'Super Secret Lich Lord Plot Twist';
  const dmNoteText = 'DM Only: Trap trigger under North altar';

  try {
    // 1. Seed dummy article with secret & dm blocks in database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO articles (id, title, category, summary, content, visibility) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          testArticleId,
          'Sanctuary of the Eclipse',
          'Location',
          `An ancient sanctuary in the mountains. [secret]${secretText}[/secret]`,
          `The Sanctuary of the Eclipse was built during the First Age. [secret]${secretText}[/secret] [dm]${dmNoteText}[/dm] Public pilgrims gather here annualy.`,
          'public'
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('Seeded test article with secret blocks into DB:', testArticleId);

    // 2. Test POST /api/marketing/generate (Kickstarter preset)
    console.log('Testing POST /api/marketing/generate with Kickstarter preset...');
    const res1 = await makeRequest('/api/marketing/generate', 'POST', {
      article_ids: [testArticleId],
      preset: 'kickstarter',
      tone_chip: 'Gritty & High Fantasy',
      cta_type: 'kickstarter'
    });

    assert.strictEqual(res1.status, 200, 'Marketing endpoint should return 200');
    assert.strictEqual(res1.body.status, 'success', 'Response status should be success');
    assert.ok(typeof res1.body.generated_copy === 'string' && res1.body.generated_copy.length > 0, 'Should return non-empty generated_copy');
    assert.strictEqual(res1.body.generated_copy.includes(secretText), false, 'Generated copy MUST NOT contain secret plot twist!');
    assert.strictEqual(res1.body.generated_copy.includes(dmNoteText), false, 'Generated copy MUST NOT contain DM note!');
    console.log('✅ Kickstarter preset test passed (spoiler guardrails verified)!');

    // 3. Test POST /api/marketing/generate (VTT Store preset with string article_ids)
    console.log('Testing POST /api/marketing/generate with VTT Store preset...');
    const res2 = await makeRequest('/api/marketing/generate', 'POST', {
      article_ids: testArticleId,
      preset: 'vtt-store',
      tone_chip: 'Mysterious',
      cta_type: 'vtt'
    });

    assert.strictEqual(res2.status, 200, 'VTT Store request should return 200');
    assert.strictEqual(res2.body.status, 'success', 'VTT Store response status should be success');
    assert.strictEqual(res2.body.generated_copy.includes(secretText), false, 'VTT Store copy MUST NOT contain secret plot twist!');
    console.log('✅ VTT Store preset test passed!');

    // 4. Test POST /api/marketing/generate (Serial Fiction preset)
    console.log('Testing POST /api/marketing/generate with Serial Fiction preset...');
    const res3 = await makeRequest('/api/marketing/generate', 'POST', {
      article_ids: [testArticleId],
      preset: 'serial-fiction',
      tone_chip: 'Suspenseful',
      cta_type: 'patreon'
    });

    assert.strictEqual(res3.status, 200, 'Serial Fiction request should return 200');
    assert.strictEqual(res3.body.status, 'success', 'Serial Fiction response status should be success');
    assert.strictEqual(res3.body.generated_copy.includes(secretText), false, 'Serial Fiction copy MUST NOT contain secret plot twist!');
    console.log('✅ Serial Fiction preset test passed!');

    // 5. Test POST /api/marketing/generate (Social Teaser preset)
    console.log('Testing POST /api/marketing/generate with Social Teaser preset...');
    const res4 = await makeRequest('/api/marketing/generate', 'POST', {
      article_ids: [testArticleId],
      preset: 'social-teaser',
      tone_chip: 'Action-Packed',
      cta_type: 'newsletter'
    });

    assert.strictEqual(res4.status, 200, 'Social Teaser request should return 200');
    assert.strictEqual(res4.body.status, 'success', 'Social Teaser response status should be success');
    assert.strictEqual(res4.body.generated_copy.includes(secretText), false, 'Social Teaser copy MUST NOT contain secret plot twist!');
    console.log('✅ Social Teaser preset test passed!');

    // 6. Test Error Handling (Missing article_ids)
    console.log('Testing POST /api/marketing/generate error handling...');
    const errRes = await makeRequest('/api/marketing/generate', 'POST', {
      preset: 'social-teaser'
    });
    assert.strictEqual(errRes.status, 400, 'Missing article_ids should return 400');
    console.log('✅ Error handling test passed!');

    // Clean up test article from DB
    await new Promise((resolve) => {
      db.run(`DELETE FROM articles WHERE id = ?`, [testArticleId], () => resolve());
    });
    console.log('Cleaned up test article.');

    console.log('\n🎉 ALL MARKETING ENGINE API TESTS PASSED SUCCESSFULLY!');
    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed:', err);
    db.run(`DELETE FROM articles WHERE id = ?`, [testArticleId], () => {
      server.close(() => {
        process.exit(1);
      });
    });
  }
});

function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}
