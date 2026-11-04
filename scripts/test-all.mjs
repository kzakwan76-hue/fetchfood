import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

// Usage: node scripts\test-all.mjs            (everything that needs no dev server)
//        node scripts\test-all.mjs --with-server   (also test-route; start "npm run dev" first)
const withServer = process.argv.includes("--with-server");
const tests = [
  "test-assistant", "test-assistant-ai", "test-ratelimit", "test-model", "test-cart",
  "test-orders", "test-dashboard", "test-admin", "test-rider", "test-reviews",
  "test-photos", "test-dish-photos", "test-customer", "test-idempotency", "test-ledger", "test-rider-kyc", "test-duty", "test-location",
];
if (withServer) tests.push("test-route");

const results = [];
for (const name of tests) {
  const file = `scripts/${name}.mjs`;
  if (!existsSync(file)) {
    results.push({ name, status: "MISSING" });
    continue;
  }
  const run = spawnSync(
    process.execPath,
    ["--no-warnings", "--import", "tsx", "--env-file=.env.local", file],
    { encoding: "utf8" },
  );
  const ok = run.status === 0;
  results.push({ name, status: ok ? "pass" : "FAIL" });
  if (!ok) {
    const tail = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.trim().split("\n").slice(-12).join("\n");
    console.log(`\n--- ${name} failed (last lines) ---\n${tail}\n`);
  }
}

console.log("\nTest results");
for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.name}`);
const failed = results.filter((r) => r.status === "FAIL").length;
console.log(failed === 0 ? "\nAll present tests passed." : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);