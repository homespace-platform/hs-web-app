const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const src = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'lib/split-sentences.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', src)(m, m.exports);
const { splitSentences } = m.exports;

test('splits on period+space only, keeps text exact', () => {
  assert.deepEqual(splitSentences('A; b 1.5 triệu. C d.'), ['A; b 1.5 triệu.', 'C d.']);
  assert.deepEqual(splitSentences('Một câu'), ['Một câu']);
  assert.deepEqual(splitSentences(''), []);
});
