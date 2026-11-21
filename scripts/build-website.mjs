import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  groupWebsitePlugins,
  insertPluginLedger,
  pluginIconPath,
  renderPluginLedger,
} from "./website-plugins.mjs";

// The plugin catalog and release download contract come from a Denote checkout.
const denote = resolve(process.env.DENOTE_SOURCE ?? ".denote");
const destination = resolve("dist/website");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(resolve("website"), destination, { recursive: true });
cpSync(resolve(denote, "release-assets.json"), resolve(destination, "release-assets.json"));

const groups = groupWebsitePlugins(readJson(resolve(denote, "plugins/catalog.json")));
const icons = new Map();
for (const plugin of groups.flatMap((group) => group.plugins)) {
  const iconPath = resolve("website", pluginIconPath(plugin));
  if (existsSync(iconPath)) icons.set(plugin.id, readFileSync(iconPath, "utf8"));
}
const indexPath = resolve(destination, "index.html");
writeFileSync(
  indexPath,
  insertPluginLedger(readFileSync(indexPath, "utf8"), renderPluginLedger(groups, icons)),
);

const pluginCount = groups.reduce((total, group) => total + group.plugins.length, 0);
console.log(`Built static website with ${pluginCount} plugins at ${destination}`);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${path}: ${error.message}`, { cause: error });
  }
}
