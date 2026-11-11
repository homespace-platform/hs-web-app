/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript helper test. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/membership-eth-payment.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleRef = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(require, moduleRef, moduleRef.exports);
const eth = moduleRef.exports;

const payer = `0x${"1".repeat(40)}`;
const recipient = `0x${"2".repeat(40)}`;
const contractAddress = `0x${"3".repeat(40)}`;
const paymentId = `0x${"a".repeat(64)}`;
const quote = () => ({
  paymentId, payer, recipient, contractAddress, amountVnd: 49000,
  amountWei: "12345678900000000", chainId: eth.SEPOLIA_CHAIN_ID,
  signature: `0x${"b".repeat(130)}`, expiresAt: new Date(Date.now() + 60000).toISOString(),
});

test("membership ETH calldata pays exact wei to the signed contract and platform recipient", () => {
  const tx = eth.buildMembershipEthTransaction(quote(), payer, 49000);
  assert.equal(tx.from, payer);
  assert.equal(tx.to, contractAddress);
  assert.equal(BigInt(tx.value), BigInt("12345678900000000"));
  assert.equal(tx.chainId, "0xaa36a7");
  assert.equal(tx.data.slice(0, 10), "0xfe908b7a");
  assert.equal(tx.data.slice(10, 74), paymentId.slice(2));
  assert.equal(tx.data.slice(74, 138), payer.slice(2).padStart(64, "0"));
  assert.equal(tx.data.slice(138, 202), recipient.slice(2).padStart(64, "0"));
  assert.equal(BigInt(`0x${tx.data.slice(202, 266)}`), BigInt(quote().amountWei));
  assert.equal(BigInt(`0x${tx.data.slice(330, 394)}`), BigInt(192));
  assert.equal(BigInt(`0x${tx.data.slice(394, 458)}`), BigInt(65));
});

test("rejects changed membership amount, wrong wallet, network, and expired quote before MetaMask", () => {
  assert.throws(() => eth.buildMembershipEthTransaction(quote(), payer, 129000));
  assert.throws(() => eth.buildMembershipEthTransaction(quote(), recipient, 49000));
  assert.throws(() => eth.buildMembershipEthTransaction({ ...quote(), chainId: 1 }, payer, 49000));
  assert.throws(() => eth.buildMembershipEthTransaction({ ...quote(), expiresAt: new Date(0).toISOString() }, payer, 49000));
});
