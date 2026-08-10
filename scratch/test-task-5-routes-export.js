/**
 * Scratch test for Task 5: Expedition Route Drawing & Offline HTML Exporter Update
 */
const assert = require('assert');
const http = require('http');
const path = require('path');

const { app, db } = require(path.join(__dirname, '../server.js'));

let server;
const PORT = 3845;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type'] && res.headers['content-type'].includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Task 5 Expedition Routes & Export Verification Suite...');

  server = app.listen(PORT, async () => {
    try {
      const testMapId = `map-t5-${Date.now()}`;
      const testWorldId = 'default';

      // 1. Create a test map with scale calibration
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO maps (id, world_id, title, image_path, width, height, scale_pixels, scale_distance, scale_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [testMapId, testWorldId, 'Task 5 Test Realm', '/uploads/maps/test.png', 1000, 1000, 100, 10, 'miles'],
          (err) => err ? reject(err) : resolve()
        );
      });

      console.log('✅ Created test map with scale calibration (100px = 10 miles)');

      // 2. Test POST /api/maps/:mapId/routes (Creating a public route)
      const route1Id = `route-pub-${Date.now()}`;
      const route1Payload = {
        id: route1Id,
        title: 'The Northern Highway',
        points_json: [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9]],
        stroke_color: '#f59e0b',
        stroke_width: 4,
        stroke_style: 'dashed',
        calculated_distance: 113.1,
        is_secret: 0
      };

      const resCreate1 = await request('POST', `/api/maps/${testMapId}/routes`, route1Payload);
      assert.strictEqual(resCreate1.status, 201, 'Route 1 creation should return 201');
      assert.strictEqual(resCreate1.data.route.title, 'The Northern Highway');
      assert.strictEqual(resCreate1.data.route.calculated_distance, 113.1);
      console.log('✅ POST /api/maps/:mapId/routes created public route successfully');

      // 3. Test POST /api/maps/:mapId/routes (Creating a secret DM route)
      const route2Id = `route-sec-${Date.now()}`;
      const route2Payload = {
        id: route2Id,
        title: 'Smugglers Secret Pass',
        points_json: [[0.2, 0.3], [0.4, 0.6]],
        stroke_color: '#ef4444',
        stroke_width: 3,
        stroke_style: 'dotted',
        calculated_distance: 50.0,
        is_secret: 1
      };

      const resCreate2 = await request('POST', `/api/maps/${testMapId}/routes`, route2Payload);
      assert.strictEqual(resCreate2.status, 201, 'Route 2 creation should return 201');
      assert.strictEqual(resCreate2.data.route.is_secret, 1);
      console.log('✅ POST /api/maps/:mapId/routes created secret DM route successfully');

      // 4. Test GET /api/maps/:mapId/routes?mode=dm vs ?mode=player
      const resDmRoutes = await request('GET', `/api/maps/${testMapId}/routes?mode=dm`);
      assert.strictEqual(resDmRoutes.status, 200);
      assert.strictEqual(resDmRoutes.data.routes.length, 2, 'DM mode should see both public and secret routes');

      const resPlayerRoutes = await request('GET', `/api/maps/${testMapId}/routes?mode=player`);
      assert.strictEqual(resPlayerRoutes.status, 200);
      assert.strictEqual(resPlayerRoutes.data.routes.length, 1, 'Player mode should only see 1 public route');
      assert.strictEqual(resPlayerRoutes.data.routes[0].id, route1Id);
      console.log('✅ GET /api/maps/:mapId/routes secret filtering validated (DM=2, Player=1)');

      // 5. Test POST /api/export/atlas/:worldId HTML bundle export
      const resExportDm = await request('POST', `/api/export/atlas/${testWorldId}`, { mode: 'dm' });
      assert.strictEqual(resExportDm.status, 200, 'HTML export should return 200');
      assert.strictEqual(typeof resExportDm.data, 'string', 'HTML export should return string HTML');
      assert.ok(resExportDm.data.includes('const routes ='), 'Exported HTML should include const routes JS array');
      assert.ok(resExportDm.data.includes('The Northern Highway'), 'Exported HTML should contain route title');
      assert.ok(resExportDm.data.includes('Smugglers Secret Pass'), 'DM HTML export should contain secret route');
      assert.ok(resExportDm.data.includes('standalone-ruler-btn'), 'Exported HTML should contain measuring ruler button');
      assert.ok(resExportDm.data.includes('standalone-pin-search'), 'Exported HTML should contain pin search bar');
      assert.ok(resExportDm.data.includes('standalone-breadcrumbs'), 'Exported HTML should contain breadcrumb container');
      console.log('✅ POST /api/export/atlas/:worldId verified offline bundle structure with routes, scale, ruler, search & breadcrumbs');

      const resExportPlayer = await request('POST', `/api/export/atlas/${testWorldId}`, { mode: 'player' });
      assert.strictEqual(resExportPlayer.status, 200);
      assert.ok(!resExportPlayer.data.includes('Smugglers Secret Pass'), 'Player HTML export MUST NOT contain secret route');
      console.log('✅ Player HTML export verified: DM secret route safely stripped');

      // 6. Test DELETE /api/maps/:mapId/routes/:routeId
      const resDelete = await request('DELETE', `/api/maps/${testMapId}/routes/${route1Id}`);
      assert.strictEqual(resDelete.status, 200);
      const resDmAfterDelete = await request('GET', `/api/maps/${testMapId}/routes?mode=dm`);
      assert.strictEqual(resDmAfterDelete.data.routes.length, 1);
      console.log('✅ DELETE /api/maps/:mapId/routes/:routeId deleted route successfully');

      // Cleanup
      await new Promise((resolve) => db.run('DELETE FROM maps WHERE id = ?', [testMapId], resolve));
      console.log('🎉 All Task 5 verification assertions PASSED cleanly!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Task 5 Test Failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
