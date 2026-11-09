const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../app/dashboard/properties/new/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const checks = [];
function visit(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast).includes('pricing.depositType === "MONTHS"')) {
    checks.push(node.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(checks.length, 2, 'Expected both deposit-month validation branches');
const js = ts.transpileModule(checks.join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

test('deposit by months accepts positive integers and rejects fractional or empty values before submission', () => {
  for (const [depositMonths, valid] of [['1', true], ['2', true], ['1.5', false], ['0', false], ['', false]]) {
    const errors = [];
    vm.runInNewContext(js, {
      pricing: { depositType: 'MONTHS', depositMonths },
      addError: (_field, key, message) => errors.push({ key, message }),
    });
    assert.equal(errors.length === 0, valid, `Unexpected validation for ${JSON.stringify(depositMonths)}`);
    if (!valid) assert.match(errors[0].message, /số nguyên dương/);
  }
});

test('deposit-month checks do not reject fixed-amount deposits', () => {
  const errors = [];
  vm.runInNewContext(js, {
    pricing: { depositType: 'AMOUNT', depositMonths: '1.5' },
    addError: (...args) => errors.push(args),
  });
  assert.equal(errors.length, 0);
});
