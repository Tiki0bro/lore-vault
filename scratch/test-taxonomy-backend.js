const assert = require('assert');
const { smartCategorizeArticle } = require('../server.js');

console.log('Testing Smart Categorizer taxonomy outputs across all 7 primary categories...');

// Test 1: Races & Species classification
const raceResult = smartCategorizeArticle('High Elven Lineage', 'The High Elves are an ancient playable race of noble lineage.');
assert.strictEqual(raceResult.category, 'Races & Species', `Expected category 'Races & Species', got '${raceResult.category}'`);
assert.strictEqual(raceResult.subCategory, 'Playable Races & Lineages', `Expected subCategory 'Playable Races & Lineages', got '${raceResult.subCategory}'`);

const beastResult = smartCategorizeArticle('Ironclaw Bear', 'A fierce wild beast and animal roaming the northern wilderness.');
assert.strictEqual(beastResult.category, 'Races & Species');
assert.strictEqual(beastResult.subCategory, 'Beasts & Creatures');

// Test 2: History classification
const historyResult = smartCategorizeArticle('The Shattering War', 'A tragic war fought during the second era of the world.');
assert.strictEqual(historyResult.category, 'History', `Expected category 'History', got '${historyResult.category}'`);
assert.strictEqual(historyResult.subCategory, 'Wars & Battles', `Expected subCategory 'Wars & Battles', got '${historyResult.subCategory}'`);

const treatyResult = smartCategorizeArticle('Accord of Sunfall', 'A solemn treaty signed between the two warring kingdoms.');
assert.strictEqual(treatyResult.category, 'History');
assert.strictEqual(treatyResult.subCategory, 'Treaties & Accords');

// Test 3: Items classification
const itemResult = smartCategorizeArticle('Vorpal Blade', 'An ancient forged weapon and razor blade.');
assert.strictEqual(itemResult.category, 'Items', `Expected category 'Items', got '${itemResult.category}'`);
assert.strictEqual(itemResult.subCategory, 'Weapons & Armaments', `Expected subCategory 'Weapons & Armaments', got '${itemResult.subCategory}'`);

const potionResult = smartCategorizeArticle('Elixir of Vitality', 'A rare alchemy potion and healing salve reagent.');
assert.strictEqual(potionResult.category, 'Items');
assert.strictEqual(potionResult.subCategory, 'Potions & Reagents');

// Test 4: Characters classification
const charResult = smartCategorizeArticle('King Alistair', 'His Majesty the King, ruler of the realm and noble sovereign.');
assert.strictEqual(charResult.category, 'Characters');
assert.strictEqual(charResult.subCategory, 'Rulers & Nobility');

// Test 5: Locations classification
const locResult = smartCategorizeArticle('Aethelgard Citadel', 'A massive mountain fortress and stronghold guarding the valley.');
assert.strictEqual(locResult.category, 'Locations');
assert.strictEqual(locResult.subCategory, 'Fortresses & Strongholds');

// Test 6: Factions classification
const factionResult = smartCategorizeArticle('Shadow Syndicate', 'An underground rogue guild operating in secret.');
assert.strictEqual(factionResult.category, 'Factions');
assert.strictEqual(factionResult.subCategory, 'Syndicates & Guilds');

// Test 7: Magic & Tech classification
const magicResult = smartCategorizeArticle('Fireball Incantation', 'An ancient destruction spell and power rune.');
assert.strictEqual(magicResult.category, 'Magic & Tech');
assert.strictEqual(magicResult.subCategory, 'Spells & Incantations');

console.log('✅ All 7 category backend taxonomy tests passed cleanly!');
