/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TS loader for logic tests. */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
/** Loads a pure lib/*.ts module (relative to the repo root); `@/lib/*` imports are loaded the same way. */
function loadTs(file) {
  const source = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
  const mod = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => name.startsWith("@/lib/") ? loadTs(name.replace("@/", "") + ".ts") : require(name), mod, mod.exports);
  return mod.exports;
}
module.exports = loadTs;
