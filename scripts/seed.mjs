import { spawnSync } from "node:child_process";

const force = process.argv.includes("--force");

function run(fn, payload) {
  const args = [
    "convex",
    "run",
    fn,
    JSON.stringify(payload ?? {}),
    "--push",
    "--typecheck",
    "disable",
  ];
  return spawnSync("npx", args, { stdio: "inherit", shell: true });
}

const payload = force ? { force: true } : {};

const res1 = run("dev/seed:seed", payload);
if (res1.error) {
  console.error(res1.error);
}
if ((res1.status ?? 1) !== 0) process.exit(res1.status ?? 1);

const res2 = run("dev/seedImages:seedImages", payload);
if (res2.error) {
  console.error(res2.error);
}
process.exit(res2.status ?? 1);
