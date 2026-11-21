// Fetches the inputs the website build reads from Denote: the plugin catalog
// and the release download contract. Git follows GitHub's repository-transfer
// redirects, and the first reachable repository wins, so the build works both
// before and after Denote moves from mbianchidev/denote to denote-io/denote.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const repositories = (process.env.DENOTE_REPOSITORY ?? "denote-io/denote,mbianchidev/denote")
  .split(",").map((value) => value.trim()).filter(Boolean);
const ref = process.env.DENOTE_REF ?? "main";
const destination = resolve(process.env.DENOTE_SOURCE ?? ".denote");
const files = ["plugins/catalog.json", "release-assets.json"];
const failures = [];

for (const repository of repositories) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid Denote repository: ${repository}`);
  }
  const checkout = mkdtempSync(join(tmpdir(), "denote-website-source-"));
  try {
    const git = (...args) => execFileSync("git", args, {
      cwd: checkout,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    git("clone", "--quiet", "--depth", "1", "--branch", ref, "--filter=blob:none", "--no-checkout",
      `https://github.com/${repository}.git`, ".");
    git("checkout", "--quiet", "HEAD", "--", ...files);
    const commit = git("rev-parse", "HEAD").toString().trim();
    rmSync(destination, { recursive: true, force: true });
    for (const path of files) {
      JSON.parse(readFileSync(join(checkout, path), "utf8"));
      mkdirSync(dirname(join(destination, path)), { recursive: true });
      cpSync(join(checkout, path), join(destination, path));
    }
    console.log(`Fetched ${files.join(" and ")} from ${repository}@${commit}.`);
    process.exit(0);
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || (error instanceof Error ? error.message : String(error));
    failures.push(`${repository}: ${detail}`);
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}
console.error(`Unable to fetch the Denote website inputs:\n- ${failures.join("\n- ")}`);
process.exit(1);
