export const PLUGIN_LEDGER_MARKER = "<!-- plugin-catalog -->";

// Mirrors pluginRepository() in plugin-downloads.mjs, which needs installed
// dependencies that the Pages workflow does not install.
const PLUGIN_ORGANIZATION = "denote-io";
const TRUSTED_PLUGIN_ID = /^denote\.([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// The Reference plugin is an SDK lifecycle fixture, not a user workflow.
const EXCLUDED_PLUGIN_IDS = new Set(["denote.reference"]);
// Order and labels match Settings → Plugins.
const CATEGORY_LABELS = new Map([
  ["code", "Code"],
  ["productivity", "Productivity"],
  ["knowledge-management", "Knowledge management"],
  ["editor-writing", "Editor and writing"],
  ["diagrams-visualization", "Diagrams and visualization"],
  ["collaboration", "Collaboration"],
  ["accessibility", "Accessibility"],
  ["security-privacy", "Security and privacy"],
  ["other", "Other"],
]);

export function groupWebsitePlugins(catalog) {
  if (!Array.isArray(catalog)) {
    throw new TypeError("The plugin catalog must be an array.");
  }
  const groups = new Map(
    [...CATEGORY_LABELS].map(([id, label]) => [id, { id, label, plugins: [] }]),
  );
  const seen = new Set();
  for (const entry of catalog) {
    const manifest = entry?.manifest;
    const id = requireText(manifest?.id, "plugin id");
    if (seen.has(id)) throw new Error(`The plugin catalog lists ${id} more than once.`);
    seen.add(id);
    if (EXCLUDED_PLUGIN_IDS.has(id)) continue;
    const group = groups.get(manifest.category);
    if (!group) {
      throw new Error(`Plugin ${id} uses unknown category ${String(manifest.category)}.`);
    }
    const repository = pluginRepository(id);
    const version = requireVersion(manifest.version, id);
    const documentation = requirePackagePath(manifest.documentation, `${id} guide`);
    group.plugins.push({
      id,
      name: requireText(manifest.name, `${id} name`),
      description: requireText(manifest.description, `${id} description`),
      version,
      repository,
      repositoryUrl: `https://github.com/${repository}`,
      guideUrl: `https://github.com/${repository}/blob/${encodeURIComponent(`v${version}`)}/${encodePath(documentation)}`,
    });
  }
  return [...groups.values()]
    .filter((group) => group.plugins.length > 0)
    .map((group) => ({
      ...group,
      plugins: group.plugins.sort((left, right) =>
        left.name.localeCompare(right.name, "en"),
      ),
    }));
}

export function pluginIconPath(plugin) {
  return `assets/plugins/${plugin.id}.svg`;
}

export function renderPluginLedger(groups, icons) {
  return groups
    .map((group) => {
      const headingId = `plugin-group-${group.id}`;
      const articles = group.plugins
        .map((plugin) => renderPlugin(plugin, requireSafeIcon(icons.get(plugin.id), plugin.id)))
        .join("\n");
      return [
        `<section class="plugin-group" aria-labelledby="${escapeHtml(headingId)}">`,
        `<h3 id="${escapeHtml(headingId)}">${escapeHtml(group.label)}</h3>`,
        articles,
        "</section>",
      ].join("\n");
    })
    .join("\n");
}

export function insertPluginLedger(html, ledger) {
  const parts = html.split(PLUGIN_LEDGER_MARKER);
  if (parts.length !== 2) {
    throw new Error(
      `The website must contain exactly one ${PLUGIN_LEDGER_MARKER} marker; found ${parts.length - 1}.`,
    );
  }
  return parts.join(ledger);
}

function renderPlugin(plugin, icon) {
  return [
    "<article>",
    `<span class="plugin-ledger__icon" aria-hidden="true">${icon}</span>`,
    "<div>",
    `<h4><a href="${escapeHtml(plugin.guideUrl)}">${escapeHtml(plugin.name)}</a></h4>`,
    `<p>${escapeHtml(plugin.description)}</p>`,
    `<a class="plugin-ledger__repository" href="${escapeHtml(plugin.repositoryUrl)}">${escapeHtml(plugin.repository)}</a>`,
    "</div>",
    `<span class="plugin-ledger__version">v${escapeHtml(plugin.version)}</span>`,
    "</article>",
  ].join("\n");
}

// Icons are inlined so they follow the theme color; allow only static SVG shapes.
function requireSafeIcon(markup, id) {
  if (typeof markup !== "string") {
    throw new Error(`Plugin ${id} has no website icon at website/${pluginIconPath({ id })}.`);
  }
  const icon = markup.trim();
  if (
    !/^(?:<!--[^]*?-->\s*)?<svg\b[^]*<\/svg>$/.test(icon) ||
    /<(?:script|style|foreignObject|image|use|a)\b|\son[a-z]+\s*=|href\s*=|url\(/i.test(icon)
  ) {
    throw new Error(`Plugin ${id} has an unsafe website icon.`);
  }
  return icon;
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The plugin catalog has a missing ${label}.`);
  }
  return value.trim();
}

function pluginRepository(id) {
  const name = TRUSTED_PLUGIN_ID.exec(id)?.[1];
  if (!name) throw new Error(`Plugin ${id} is not a trusted denote.<name> plugin ID.`);
  return `${PLUGIN_ORGANIZATION}/denote-${name}`;
}

function requireVersion(value, id) {
  const version = requireText(value, `${id} version`);
  if (!SEMANTIC_VERSION.test(version)) {
    throw new Error(`Plugin ${id} has an invalid version: ${version}.`);
  }
  return version;
}

function requirePackagePath(value, label) {
  const path = requireText(value, label);
  const segments = path.split("/");
  if (path.startsWith("/") || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`The plugin catalog has an unsafe ${label} path: ${path}.`);
  }
  return path;
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
