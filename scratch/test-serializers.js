const assert = require('assert');
const { serializeMarkdown, serializeXML, serializeJSON, serializeYAML, serializeContext } = require('../server');

const sampleArticles = [
  { id: 'art-1', title: 'Valoria', category: 'Factions', summary: 'Empire', content: 'Empire lore' }
];

console.log('Testing serializer exports...');
assert(typeof serializeMarkdown === 'function', 'serializeMarkdown should be a function exported by server.js');
assert(typeof serializeXML === 'function', 'serializeXML should be a function exported by server.js');
assert(typeof serializeJSON === 'function', 'serializeJSON should be a function exported by server.js');
assert(typeof serializeYAML === 'function', 'serializeYAML should be a function exported by server.js');
assert(typeof serializeContext === 'function', 'serializeContext should be a function exported by server.js');

// Test serializeMarkdown
const mdOutput = serializeMarkdown(sampleArticles);
assert(mdOutput.includes('# Entity: Valoria (Factions)'), 'serializeMarkdown header mismatch');
assert(mdOutput.includes('> Empire'), 'serializeMarkdown summary mismatch');
assert(mdOutput.includes('Empire lore'), 'serializeMarkdown content mismatch');

// Test serializeXML
const xmlOutput = serializeXML(sampleArticles);
assert(xmlOutput.includes('<entity id="art-1" category="Factions">'), 'serializeXML entity tag mismatch');
assert(xmlOutput.includes('<title>Valoria</title>'), 'serializeXML title tag mismatch');
assert(xmlOutput.includes('<![CDATA[Empire lore]]>'), 'serializeXML CDATA content mismatch');

// Test serializeJSON
const jsonOutput = serializeJSON(sampleArticles);
const parsedJSON = JSON.parse(jsonOutput);
assert.strictEqual(parsedJSON.count, 1, 'serializeJSON count mismatch');
assert.strictEqual(parsedJSON.entities[0].id, 'art-1', 'serializeJSON entity id mismatch');

// Test serializeYAML
const yamlOutput = serializeYAML(sampleArticles);
assert(yamlOutput.includes('entities:'), 'serializeYAML entities key missing');
assert(yamlOutput.includes('id: art-1'), 'serializeYAML id missing');
assert(yamlOutput.includes('title: "Valoria"'), 'serializeYAML title missing');

// Test serializeContext with different formats
assert(serializeContext(sampleArticles, 'xml').includes('<entity id="art-1"'), 'serializeContext XML format failed');
assert(serializeContext(sampleArticles, 'json').includes('"id": "art-1"'), 'serializeContext JSON format failed');
assert(serializeContext(sampleArticles, 'yaml').includes('id: art-1'), 'serializeContext YAML format failed');
assert(serializeContext(sampleArticles, 'markdown').includes('# Entity: Valoria'), 'serializeContext Markdown format failed');

// Test fallback to markdown when format is unknown or empty
assert(serializeContext(sampleArticles, 'unknown').includes('# Entity: Valoria'), 'serializeContext fallback format failed');
assert(serializeContext(sampleArticles).includes('# Entity: Valoria'), 'serializeContext default format failed');

console.log('✅ Serializer unit tests passed!');
