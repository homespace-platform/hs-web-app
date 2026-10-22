import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncData, validateCatalog } from "./sync-address-data.mjs";

function fixture() {
  const provinces = {}, wards = {};
  for (let city = 11; city < 45; city++) {
    const code = String(city);
    provinces[code] = { code, name: `Tỉnh ${code}`, name_with_type: `Tỉnh ${code}`, type: "tinh", slug: `tinh-${code}` };
    for (let n = 0; n < 90; n++) {
      const wardCode = String(city * 100 + n);
      wards[wardCode] = { code: wardCode, parent_code: code, name: `Xã ${wardCode}`, name_with_type: `Xã ${wardCode}`, type: "xa", slug: `xa-${wardCode}` };
    }
  }
  return { provinces, wards };
}
const sha = "a".repeat(40);
function provider(data, calls, fail = "") {
  return async url => {
    calls.push(url);
    if (url.includes(fail) && fail) return { ok: false, status: 503 };
    const body = url.endsWith("commits/main") ? JSON.stringify({ sha })
      : url.endsWith("province.json") ? JSON.stringify(data.provinces)
      : url.endsWith("ward.json") ? JSON.stringify(data.wards) : "VietMap license ".repeat(20);
    return { ok: true, text: async () => body };
  };
}

test("validates raw Vietmap string codes, parent relations and nationwide completeness", () => {
  const { provinces, wards } = fixture();
  assert.deepEqual(validateCatalog(provinces, wards), { provinces: 34, wards: 3060 });
  assert.throws(() => validateCatalog([], wards), /code-keyed/);
  assert.throws(() => validateCatalog({ ...provinces, 11: { ...provinces[11], code: 11 } }, wards), /string code/);
  assert.throws(() => validateCatalog(provinces, { ...wards, 1100: { ...wards[1100], parent_code: "unknown" } }), /parent_code/);
  assert.throws(() => validateCatalog(provinces, { ...wards, 1100: { ...wards[1100], code: "1101" } }), /string code/);
  const incomplete = { ...provinces }; delete incomplete[11];
  assert.throws(() => validateCatalog(incomplete, wards), /Incomplete/);
  const missingWards = Object.fromEntries(Object.entries(wards).filter(([, ward]) => ward.parent_code !== "11"));
  assert.throws(() => validateCatalog(provinces, missingWards), /Incomplete|no wards/);
});

test("pins both JSON and license to one commit, preserves raw bytes, and skips unchanged snapshots", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hs-web-catalog-test-"));
  try {
    const output = path.join(root, "vietmap"), data = fixture(), calls = [];
    const options = { output, fetcher: provider(data, calls) };
    assert.equal((await syncData(options)).changed, true);
    assert.equal(await readFile(path.join(output, "province.json"), "utf8"), JSON.stringify(data.provinces));
    assert.equal(await readFile(path.join(output, "ward.json"), "utf8"), JSON.stringify(data.wards));
    assert.match(await readFile(path.join(output, "SOURCE.md"), "utf8"), new RegExp(sha));
    assert.ok(calls.slice(1).every(url => url.includes(`/${sha}/`)));
    assert.equal((await syncData(options)).changed, false);
    assert.deepEqual((await readdir(root)).sort(), ["vietmap"]);
    // Exercise the successful replacement path, not just the initial write.
    data.wards[1100].name_with_type = "Xã cập nhật";
    assert.equal((await syncData(options)).changed, true);
    assert.match(await readFile(path.join(output, "ward.json"), "utf8"), /Xã cập nhật/);
    assert.deepEqual((await readdir(root)).sort(), ["vietmap"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed HTTP and invalid source data never overwrite an existing snapshot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hs-web-catalog-test-"));
  try {
    const output = path.join(root, "vietmap"), data = fixture();
    await syncData({ output, fetcher: provider(data, []) });
    const before = await readFile(path.join(output, "ward.json"), "utf8");
    await assert.rejects(syncData({ output, fetcher: provider(data, [], "ward.json") }), /Download failed/);
    data.wards[1100].parent_code = "999";
    await assert.rejects(syncData({ output, fetcher: provider(data, []) }), /parent_code/);
    assert.equal(await readFile(path.join(output, "ward.json"), "utf8"), before);
    assert.deepEqual((await readdir(root)).sort(), ["vietmap"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
