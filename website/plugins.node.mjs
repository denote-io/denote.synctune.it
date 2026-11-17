import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupWebsitePlugins,
  insertPluginLedger,
  PLUGIN_LEDGER_MARKER,
  renderPluginLedger,
} from "../scripts/website-plugins.mjs";

const icon = '<svg viewBox="0 0 24 24"><path d="M4 12h16" /></svg>';
const directories = new Map([
  ["example.zeta", "zeta"],
  ["example.alpha", "alpha"],
  ["example.notes", "notes"],
  ["denote.reference", "reference"],
]);

describe("website plugin ledger", () => {
  it("groups user-facing plugins by app category order and name", () => {
    const groups = groupWebsitePlugins(
      [
        entry("example.notes", "Notes", "knowledge-management"),
        entry("denote.reference", "Reference", "other"),
        entry("example.zeta", "Zeta tool", "code"),
        entry("example.alpha", "Alpha tool", "code"),
      ],
      directories,
    );

    assert.deepEqual(
      groups.map((group) => [group.label, group.plugins.map((plugin) => plugin.id)]),
      [
        ["Code", ["example.alpha", "example.zeta"]],
        ["Knowledge management", ["example.notes"]],
      ],
    );
  });

  it("rejects catalog entries the site cannot represent", () => {
    assert.throws(
      () => groupWebsitePlugins([entry("example.alpha", "Alpha", "unknown")], directories),
      /unknown category/,
    );
    assert.throws(
      () => groupWebsitePlugins([entry("example.missing", "Missing", "code")], directories),
      /No plugin package directory declares example\.missing/,
    );
    assert.throws(
      () =>
        groupWebsitePlugins(
          [entry("example.alpha", "Alpha", "code"), entry("example.alpha", "Alpha", "code")],
          directories,
        ),
      /more than once/,
    );
    assert.throws(
      () =>
        groupWebsitePlugins(
          [entry("example.alpha", "Alpha", "code", { documentation: "../guide.md" })],
          directories,
        ),
      /unsafe example\.alpha guide path/,
    );
  });

  it("escapes catalog text, inlines the icon, and links each plugin to its guide", () => {
    const html = renderPluginLedger(
      groupWebsitePlugins(
        [entry("example.alpha", 'Alpha <b>"tool"</b>', "code", { description: "Use & <script>" })],
        directories,
      ),
      new Map([["example.alpha", `<!-- synthetic -->\n${icon}\n`]]),
    );

    assert.match(html, /<h3 id="plugin-group-code">Code<\/h3>/);
    assert.match(html, /Alpha &lt;b&gt;&quot;tool&quot;&lt;\/b&gt;/);
    assert.match(html, /<p>Use &amp; &lt;script&gt;<\/p>/);
    assert.ok(
      html.includes(`<span class="plugin-ledger__icon" aria-hidden="true"><!-- synthetic -->\n${icon}</span>`),
    );
    assert.match(
      html,
      /href="https:\/\/github\.com\/mbianchidev\/denote\/blob\/main\/plugins\/alpha\/guide\.md"/,
    );
    assert.match(html, /v1\.2\.3/);
    assert.doesNotMatch(html, /<script>|<b>/);
  });

  it("requires a static SVG icon for every listed plugin", () => {
    const groups = groupWebsitePlugins([entry("example.alpha", "Alpha", "code")], directories);

    assert.throws(
      () => renderPluginLedger(groups, new Map()),
      /example\.alpha has no website icon at website\/assets\/plugins\/example\.alpha\.svg/,
    );
    for (const unsafe of [
      '<svg onload="alert(1)"></svg>',
      "<svg><script>alert(1)</script></svg>",
      '<svg><use href="#shape" /></svg>',
      "<div></div>",
    ]) {
      assert.throws(
        () => renderPluginLedger(groups, new Map([["example.alpha", unsafe]])),
        /example\.alpha has an unsafe website icon/,
      );
    }
  });

  it("requires exactly one marker in the page", () => {
    assert.equal(
      insertPluginLedger(`<div>${PLUGIN_LEDGER_MARKER}</div>`, "<p>Ledger</p>"),
      "<div><p>Ledger</p></div>",
    );
    assert.throws(() => insertPluginLedger("<div></div>", ""), /found 0/);
    assert.throws(
      () => insertPluginLedger(PLUGIN_LEDGER_MARKER.repeat(2), ""),
      /found 2/,
    );
  });
});

function entry(id, name, category, overrides = {}) {
  return {
    manifest: {
      id,
      name,
      category,
      version: "1.2.3",
      description: "Synthetic plugin description.",
      documentation: "guide.md",
      ...overrides,
    },
  };
}
