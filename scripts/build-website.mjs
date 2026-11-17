import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  groupWebsitePlugins,
  insertPluginLedger,
  renderPluginLedger,
} from "./website-plugins.mjs";

const destination = resolve("dist/website");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(resolve("website"), destination, { recursive: true });
cpSync(resolve("release-assets.json"), resolve(destination, "release-assets.json"));

const pluginsRoot = resolve("plugins");
const groups = groupWebsitePlugins(
  readJson(resolve(pluginsRoot, "catalog.json")),
  readPluginPackageDirectories(pluginsRoot),
);
const indexPath = resolve(destination, "index.html");
writeFileSync(
  indexPath,
  insertPluginLedger(readFileSync(indexPath, "utf8"), renderPluginLedger(groups)),
);

const pluginCount = groups.reduce((total, group) => total + group.plugins.length, 0);
console.log(`Built static website with ${pluginCount} plugins at ${destination}`);

function readPluginPackageDirectories(root) {
  const directories = new Map();
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const manifestPath = resolve(root, entry.name, "plugin.json");
    if (!entry.isDirectory() || !existsSync(manifestPath)) continue;
    const { id } = readJson(manifestPath);
    if (directories.has(id)) {
      throw new Error(`Plugin ${id} is declared by both ${directories.get(id)} and ${entry.name}.`);
    }
    directories.set(id, entry.name);
  }
  return directories;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${path}: ${error.message}`, { cause: error });
  }
}
