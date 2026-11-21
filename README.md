# denote.synctune.it

The public website for [Denote](https://github.com/mbianchidev/denote), served at
[denote.synctune.it](https://denote.synctune.it). Part of Synctune. It is a
dependency-free static site: no framework, no bundler, and no npm dependencies.

## Develop

Use the Node.js version in `.node-version`.

```bash
npm test               # release, download, theme, and plugin list logic
npm run fetch:denote   # Denote's plugin catalog and release contract
npm run build          # writes dist/website
python3 -m http.server 4173 --directory dist/website
```

Tests use Node's built-in test runner and synthetic fixtures. For watch mode,
run `node --test --watch website/*.node.mjs`.

## Inputs from Denote

The site reads two files from the Denote repository's `main` branch:

- `plugins/catalog.json` renders the **Plugins** section at build time.
- `release-assets.json` is the download contract. It is copied into the site,
  and `site.js` combines it with the latest GitHub release to resolve platform
  downloads in the browser.

`npm run fetch:denote` clones them into ignored `.denote/` with Git, which
follows GitHub's repository-transfer redirects. It tries `denote-io/denote`
first and then `mbianchidev/denote`; set `DENOTE_REPOSITORY` (comma-separated)
or `DENOTE_REF` to override. `npm run build` reads them from `DENOTE_SOURCE`
(default `.denote`).

The Pages workflow also runs daily, so catalog changes in Denote appear without
a commit here. Run the **Pages** workflow manually to publish one immediately.

## Plugin list

`npm run build` renders the **Plugins** section only from the catalog, grouped by
Denote's Settings → Plugins categories. Each plugin links to its guide at the
released tag in its plugin repository and to that repository. It excludes only
the SDK-only Reference plugin and fails on an unknown category, an untrusted
plugin ID, or a missing or non-static `website/assets/plugins/<id>.svg` icon, so
preview the built `dist/website`, not the raw `website/index.html`.

A new plugin needs that icon: copy the matching unmodified icon from the
`lucide-static` release that matches Denote's locked `lucide-react` version,
keeping its license comment, and reuse the plugin's activity-rail icon when it
has one. `LICENSE-lucide.txt` in that folder carries the required notice.

## Design

The site extends Denote's Quiet Workbench rather than introducing a separate
marketing system. A file-path spine leads into the real application preview;
graphite/paper surfaces, moss actions, one-pixel rules, tight corners, and the
asymmetric mark carry the desktop identity. Platform downloads remain visible
together, with recommendation treated as supplementary text rather than hiding
alternatives. The plugin ledger lists every user-facing catalog plugin with an
icon, a name linking to its guide at the released tag, description, a small
monospace link to its repository labeled like `denote-io/denote-kanban`, and
current version, grouped under the same category labels as Settings → Plugins.
Icons are website-owned Lucide outlines in the moss accent, reusing the
activity-rail icon where the app has one, because package icons are not a
consistent visual set. Follow Denote's
[design guide](https://github.com/mbianchidev/denote/blob/main/docs/design.md)
for shared interface conventions.

## Deploy

GitHub Pages uses **GitHub Actions** as its source, with the custom domain
`denote.synctune.it`. The Pages workflow tests and builds pull requests, and
deploys from `main`, the daily schedule, or manual dispatch.

## History

The site was developed in `website/` of the Denote repository; that history is
preserved here.

## License

[MIT](LICENSE)
