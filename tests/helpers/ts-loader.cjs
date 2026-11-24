/* eslint-disable @typescript-eslint/no-require-imports -- test helper: runs real TypeScript with isolated dependencies. */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const root = path.join(__dirname, "..", "..");
const cache = new Map();
const EXT = [".tsx", ".ts"];

/**
 * Transpiles and runs a repo file. `@/lib/*` and relative imports load the real source; everything else under `@/`
 * resolves through `overrides` (name -> module) and otherwise to `{}`; bare packages use node's require.
 */
function loadTs(file, overrides = {}) {
  const key = file + (Object.keys(overrides).length ? JSON.stringify(Object.keys(overrides)) : "");
  if (cache.has(key)) return cache.get(key);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const resolveFile = (base) => EXT.map((e) => base + e).find((f) => fs.existsSync(path.join(root, f)));
  const resolve = (name) => {
    if (name in overrides) return overrides[name];
    if (name.startsWith("@/lib/")) { const f = resolveFile(name.slice(2)); if (f) return loadTs(f, overrides); }
    if (name.startsWith("./") || name.startsWith("../")) {
      const f = resolveFile(path.posix.normalize(path.posix.join(path.posix.dirname(file.split(path.sep).join("/")), name)));
      if (f) return loadTs(f, overrides);
    }
    return name.startsWith("@/") ? {} : require(name);
  };
  cache.set(key, mod.exports);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(resolve, mod, mod.exports);
  cache.set(key, mod.exports);
  return mod.exports;
}
module.exports = { loadTs };
