/**
 * Production build entry. Forces NODE_ENV=production before Next loads .env
 * so a leftover NODE_ENV=development on the server cannot break /_global-error
 * prerender (known Next.js 16 issue).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const env = { ...process.env, NODE_ENV: "production" };

const result = spawnSync(process.execPath, [nextBin, "build"], {
  cwd: root,
  env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
