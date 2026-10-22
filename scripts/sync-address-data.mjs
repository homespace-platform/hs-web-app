import { mkdir, mkdtemp, readFile, writeFile, rename, rm, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY = "vietmap-company/vietnam_administrative_address";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "data", "vietmap");
const hash = text => createHash("sha256").update(text).digest("hex");

export function validateCatalog(provinces, wards) {
  function records(value, name) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name}: expected a code-keyed object`);
    for (const [key, record] of Object.entries(value)) {
      if (!record || typeof record.code !== "string" || !/^\d+$/.test(record.code) || key !== record.code) {
        throw new Error(`${name}: invalid string code at ${key}`);
      }
      for (const field of ["name", "name_with_type", "type", "slug"]) {
        if (typeof record[field] !== "string" || !record[field].trim()) throw new Error(`${name} ${key}: missing ${field}`);
      }
    }
    return Object.values(value);
  }
  const cities = records(provinces, "province"), communes = records(wards, "ward");
  // Guard incomplete downloads. A future structural change requires a reviewed sync-script update.
  if (cities.length !== 34 || communes.length < 3000) throw new Error(`Incomplete catalog: ${cities.length} provinces, ${communes.length} wards`);
  const counts = new Map(cities.map(city => [city.code, 0]));
  for (const ward of communes) {
    if (typeof ward.parent_code !== "string" || !counts.has(ward.parent_code)) throw new Error(`ward ${ward.code}: unknown parent_code`);
    counts.set(ward.parent_code, counts.get(ward.parent_code) + 1);
  }
  if ([...counts.values()].some(count => !count)) throw new Error("A province has no wards");
  return { provinces: cities.length, wards: communes.length };
}

async function download(url, fetcher) {
  const response = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "homespace-web-location-sync" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.text();
}

export async function syncData({ fetcher = fetch, output = OUTPUT } = {}) {
  // Pin both JSON files and their license to the SAME upstream commit.
  const commit = JSON.parse(await download(`https://api.github.com/repos/${REPOSITORY}/commits/main`, fetcher));
  if (typeof commit.sha !== "string" || !/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error("Invalid GitHub commit SHA");
  const base = `https://raw.githubusercontent.com/${REPOSITORY}/${commit.sha}`;
  const [provinceText, wardText, license] = await Promise.all([
    download(`${base}/admin_new/province.json`, fetcher),
    download(`${base}/admin_new/ward.json`, fetcher),
    download(`${base}/LICENSE`, fetcher),
  ]);
  const counts = validateCatalog(JSON.parse(provinceText), JSON.parse(wardText));
  if (!license.includes("VietMap") || license.length < 100) throw new Error("Missing upstream license");
  const source = `# Administrative data provided by VietMap\n\nSource: https://github.com/${REPOSITORY}\nCommit: ${commit.sha}\nDataset: admin_new (new administrative addresses)\nProvince SHA-256: ${hash(provinceText)}\nWard SHA-256: ${hash(wardText)}\n\nSee LICENSE.txt for the original data license. JSON files are stored unchanged.\n`;
  const files = { "province.json": provinceText, "ward.json": wardText, "LICENSE.txt": license, "SOURCE.md": source };
  if ((await Promise.all(Object.entries(files).map(async ([file, value]) => {
    try { return await readFile(path.join(output, file), "utf8") === value; } catch { return false; }
  }))).every(Boolean)) return { ...counts, commit: commit.sha, changed: false };

  // Validate/download everything first; publish the complete directory, restoring the old pair on failure.
  await mkdir(path.dirname(output), { recursive: true });
  const staged = await mkdtemp(path.join(path.dirname(output), ".vietmap-sync-"));
  const previous = `${staged}-previous`;
  let backedUp = false, published = false;
  try {
    await Promise.all(Object.entries(files).map(([file, value]) => writeFile(path.join(staged, file), value, "utf8")));
    try {
      const info = await lstat(output);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Output must be a real snapshot directory");
      await rename(output, previous);
      backedUp = true;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    try { await rename(staged, output); published = true; }
    catch (error) { if (backedUp) { await rename(previous, output); backedUp = false; } throw error; }
  } finally {
    if (!published) await rm(staged, { recursive: true, force: true });
    if (published && backedUp) await rm(previous, { recursive: true, force: true });
  }
  return { ...counts, commit: commit.sha, changed: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncData().then(result => console.log({ ...result, output: OUTPUT })).catch(error => { console.error(error.message); process.exitCode = 1; });
}
