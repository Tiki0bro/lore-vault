const { db } = require('../server');

db.all("SELECT id, title, category FROM articles", (err, rows) => {
  if (err) return console.error(err);
  console.log('Total articles:', rows.length);
  const matches = rows.filter(r => r.title.toLowerCase().includes('elven') || r.title.toLowerCase().includes('sanctuary') || r.title.toLowerCase().includes('twin'));
  console.log('Matches:', matches);
  process.exit(0);
});
