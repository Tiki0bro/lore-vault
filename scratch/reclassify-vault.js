const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { smartCategorizeArticle } = require('../server.js');

const dbPath = path.join(__dirname, '..', 'database', 'lore.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting Vault Reclassification on database/lore.db...');

db.serialize(() => {
  // First run startup migration to ensure legacy 'Species' is updated
  db.run("UPDATE articles SET category = 'Races & Species' WHERE category = 'Species'");

  db.all('SELECT id, title, category, sub_category, content FROM articles', (err, rows) => {
    if (err) {
      console.error('Error reading articles:', err.message);
      process.exit(1);
    }

    console.log(`Processing ${rows.length} total vault articles...`);

    let updatedCount = 0;
    const categoryStats = {};
    const subCategoryStats = {};
    const sampleResults = [];

    const stmt = db.prepare('UPDATE articles SET category = ?, sub_category = ? WHERE id = ?');

    rows.forEach(art => {
      const smart = smartCategorizeArticle(art.title, art.content || '');
      
      const newCategory = smart.category;
      const newSubCategory = smart.subCategory;

      categoryStats[newCategory] = (categoryStats[newCategory] || 0) + 1;
      const subKey = `${newCategory} -> ${newSubCategory}`;
      subCategoryStats[subKey] = (subCategoryStats[subKey] || 0) + 1;

      if (art.category !== newCategory || art.sub_category !== newSubCategory) {
        updatedCount++;
      }

      sampleResults.push({
        id: art.id,
        title: art.title,
        oldCategory: art.category,
        oldSubCategory: art.sub_category,
        newCategory,
        newSubCategory
      });

      stmt.run(newCategory, newSubCategory, art.id);
    });

    stmt.finalize(() => {
      console.log('\n=== RECLASSIFICATION COMPLETE ===');
      console.log(`Total Articles Analyzed: ${rows.length}`);
      console.log(`Articles Updated with New Taxonomy: ${updatedCount}`);

      console.log('\n--- PRIMARY CATEGORY BREAKDOWN ---');
      Object.entries(categoryStats).forEach(([cat, count]) => {
        console.log(`- ${cat}: ${count} articles`);
      });

      console.log('\n--- SUB-CATEGORY BREAKDOWN ---');
      Object.entries(subCategoryStats).forEach(([subKey, count]) => {
        console.log(`- ${subKey}: ${count} articles`);
      });

      console.log('\n--- SAMPLE RECLASSIFIED ARTICLES (FIRST 15) ---');
      sampleResults.slice(0, 15).forEach(s => {
        console.log(`• "${s.title}"`);
        console.log(`  Was: [${s.oldCategory || 'Uncategorized'} | ${s.oldSubCategory || 'None'}]`);
        console.log(`  Now: [${s.newCategory} | ${s.newSubCategory}]`);
      });

      db.close();
    });
  });
});
