import { spawnSync } from "node:child_process";

const { status, error } = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "-p", "3000"],
  { stdio: "inherit" },
);

if (error) throw error;
process.exitCode = status ?? 1;
