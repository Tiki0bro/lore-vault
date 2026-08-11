const { db } = require('../server');

console.log('Testing lore_relationships schema...');
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='lore_relationships'", (err, row) => {
  if (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
  if (!row) {
    console.error('Test Failed: Table lore_relationships does not exist');
    process.exit(1);
  }
  console.log('Test Passed: Table lore_relationships exists!');
  process.exit(0);
});
