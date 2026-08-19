const http = require('http');

async function runTest() {
  console.log('--- PRE-FLIGHT / POST-FLIGHT INTEGRATION TEST: WORLD DOCTOR ---');
  try {
    const res = await fetch('http://localhost:3000/api/audit/run');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('✅ /api/audit/run baseline:', {
      healthScore: data.healthScore,
      totalAudited: data.totalAudited,
      stubs: data.stubCount,
      misclassified: data.misclassifiedCount,
      duplicates: data.duplicateCount,
      orphans: data.orphanCount
    });
  } catch (err) {
    console.error('❌ Integration test error:', err.message);
    process.exit(1);
  }
}

runTest();
