const { db } = require('../server');

db.all("SELECT id, title, image_path FROM maps ORDER BY id DESC LIMIT 5", (err, maps) => {
  console.log('Recent Maps:', maps);
  if (maps && maps.length > 0) {
    const latestMap = maps[0];
    db.all("SELECT id, label, article_id FROM map_pins WHERE map_id = ?", [latestMap.id], (err2, pins) => {
      console.log(`Pins for latest map "${latestMap.title}" (${latestMap.id}) [Count: ${pins.length}]:`, pins);
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
