import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupWebsitePlugins,
  insertPluginLedger,
  PLUGIN_LEDGER_MARKER,
  renderPluginLedger,
} from "../scripts/website-plugins.mjs";

const icon = '<svg viewBox="0 0 24 24"><path d="M4 12h16" /></svg>';

describe("website plugin ledger", () => {
  it("groups user-facing plugins by app category order and name", () => {
    const groups = groupWebsitePlugins([
      entry("denote.notes", "Notes", "knowledge-management"),
      entry("denote.reference", "Reference", "other"),
      entry("denote.zeta", "Zeta tool", "code"),
      entry("denote.alpha", "Alpha tool", "code"),
    ]);

    assert.deepEqual(
      groups.map((group) => [group.label, group.plugins.map((plugin) => plugin.id)]),
      [
        ["Code", ["denote.alpha", "denote.zeta"]],
        ["Knowledge management", ["denote.notes"]],
      ],
    );
  });

  it("rejects catalog entries the site cannot represent", () => {
    assert.throws(
      () => groupWebsitePlugins([entry("denote.alpha", "Alpha", "unknown")]),
      /unknown category/,
    );
    assert.throws(
      () => groupWebsitePlugins([entry("example.alpha", "Alpha", "code")]),
      /example\.alpha is not a trusted denote\.<name> plugin ID/,
    );
    assert.throws(
      () =>
        groupWebsitePlugins([
          entry("denote.alpha", "Alpha", "code"),
          entry("denote.alpha", "Alpha", "code"),
        ]),
      /more than once/,
    );
    assert.throws(
      () =>
        groupWebsitePlugins([
          entry("denote.alpha", "Alpha", "code", { documentation: "../guide.md" }),
        ]),
      /unsafe denote\.alpha guide path/,
    );
    assert.throws(
      () =>
        groupWebsitePlugins([entry("denote.alpha", "Alpha", "code", { version: "main/../x" })]),
      /denote\.alpha has an invalid version: main\/\.\.\/x/,
    );
  });

  it("escapes catalog text, inlines the icon, and links each plugin to its repository and released guide", () => {
    const html = renderPluginLedger(
      groupWebsitePlugins([
        entry("denote.alpha-tool", 'Alpha <b>"tool"</b>', "code", {
          description: "Use & <script>",
          documentation: "docs/guide.md",
        }),
      ]),
      new Map([["denote.alpha-tool", `<!-- synthetic -->\n${icon}\n`]]),
    );

    assert.match(html, /<h3 id="plugin-group-code">Code<\/h3>/);
    assert.match(html, /Alpha &lt;b&gt;&quot;tool&quot;&lt;\/b&gt;/);
    assert.match(html, /<p>Use &amp; &lt;script&gt;<\/p>/);
    assert.ok(
      html.includes(`<span class="plugin-ledger__icon" aria-hidden="true"><!-- synthetic -->\n${icon}</span>`),
    );
    assert.ok(
      html.includes(
        '<h4><a href="https://github.com/denote-io/denote-alpha-tool/blob/v1.2.3/docs/guide.md">',
      ),
    );
    assert.ok(
      html.includes(
        '<a class="plugin-ledger__repository" href="https://github.com/denote-io/denote-alpha-tool">denote-io/denote-alpha-tool</a>',
      ),
    );
    assert.match(html, /v1\.2\.3/);
    assert.doesNotMatch(html, /<script>|<b>/);
  });

  it("requires a static SVG icon for every listed plugin", () => {
    const groups = groupWebsitePlugins([entry("denote.alpha", "Alpha", "code")]);

    assert.throws(
      () => renderPluginLedger(groups, new Map()),
      /denote\.alpha has no website icon at website\/assets\/plugins\/denote\.alpha\.svg/,
    );
    for (const unsafe of [
      '<svg onload="alert(1)"></svg>',
      "<svg><script>alert(1)</script></svg>",
      '<svg><use href="#shape" /></svg>',
      "<div></div>",
    ]) {
      assert.throws(
        () => renderPluginLedger(groups, new Map([["denote.alpha", unsafe]])),
        /denote\.alpha has an unsafe website icon/,
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
