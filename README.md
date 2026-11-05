# Courtside

A phone-friendly volleyball scoreboard for courtside scoring, with large touch controls, editable team names, serving selection, undo, side swapping, match settings, and set tracking. Match state saves locally in the current browser after every action.

## Getting started

### Prerequisites

- Node.js 22.12 or newer, as specified in `package.json`.
- npm, included with Node.js.
- Apple's Swift command line tools only if you want the optional native macOS preview.

### Installation

From the repository root, install the dependencies pinned in `package-lock.json`:

```sh
npm ci
```

### Running

```sh
npm run dev
```

Open the local URL printed by Vite. To test on a phone on the same network, run `npm run dev -- --host` and open the network URL it prints. Stop the server with Ctrl+C.

## Build, preview and test

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the production website into `dist/`. |
| `npm run preview` | Serve an existing production build locally. Run the build first. |
| `npm test` | Run all automated tests, including a production build check. |
| `npm run build:macos` | Build the website and compile the optional native macOS preview. |

To preview a production build:

```sh
npm run build
npm run preview
```

Open the URL Vite prints. The preview server is for local verification; deploy the contents of `dist/` to an HTTPS static host for use on a phone. Assets use relative paths, allowing deployment at either a domain root or a subdirectory. The website runs entirely in the browser and requires no application backend.

Tests use Node's built-in test runner. They cover scoring, serving selection, undo, deuce, all supported match formats, reset confirmation, swapping, saved matches, and older-save compatibility. The build test rebuilds `dist/` and verifies the generated service worker's asset list, old-cache cleanup, and offline navigation fallback using browser API mocks. To run only the scoring tests:

```sh
node --test test/app.test.js
```

## Cloudflare deployment

The project deploys to Cloudflare Workers as a static website. `wrangler.jsonc` tells Wrangler to upload the production files from `dist/`; no Worker script or Cloudflare Vite plugin is needed.

In Cloudflare Workers Builds, use these settings:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |

The existing `npx wrangler deploy` command also works and uses the Wrangler version installed from `package-lock.json`. Set `name` in `wrangler.jsonc` to match the Worker name in your Cloudflare dashboard; the default here is `courtside-scoreboard`.

To validate deployment locally without publishing:

```sh
npm run build
npm run deploy -- --dry-run
```

For a manual deployment, authenticate with `npx wrangler login`, then run `npm run build` and `npm run deploy`.

## Tech stack

- Vanilla JavaScript, HTML, and CSS for the browser application.
- Vite for development, production builds, and browser previews.
- Browser local storage for match state and a service worker for offline assets.
- Node's built-in test runner for automated checks.
- Swift, Cocoa, and WebKit for the optional native macOS preview.

## Project structure

```text
index.html          Website entry point
src/                Application JavaScript, styles, and service worker template
public/             Icon and web app manifest, copied unchanged into dist/
test/               Application and production-build tests
vite.config.js      Relative deployment paths and offline asset generation
package.json        npm commands, Node requirement, and dependencies
package-lock.json   Pinned dependency versions for npm ci
native/macos/       Optional Swift preview source
scripts/            Optional native build tooling
dist/               Generated website; ignored by Git
build/              Generated native preview; ignored by Git
```

`node_modules/` contains installed dependencies and is also ignored by Git. If an older checkout has a `target/` directory, it contains artifacts from the retired Rust build. The current npm workflow does not use it, and it can be deleted.

## Optional macOS preview

The normal browser preview is `npm run preview`. To build and launch the separate native preview on macOS:

```sh
npm run build:macos
./build/macos/courtside-preview
```

This displays the built website from `dist/`. Keep the executable in `build/macos/` so it can locate those files. To capture the initial view and exit:

```sh
./build/macos/courtside-preview --screenshot /tmp/courtside.png
```

## Using the scoreboard

Both team scores stay side by side on narrow screens. Tap a team's point button to add a point and assign the serve to that team. Tap the team name to select the serving team manually. Undo restores the previous scoring, serving, or set-transition action; Swap sides changes the display order.

The default format is best of three, 21 points per set, with a deciding set to 15. Every set must be won by two points. Match settings also offers best of five and 25-, 15-, or 11-point sets. For 15-point matches, the deciding set goes to 11; 11-point matches use 11 for every set. Match format can be changed before the first point or after starting a new match. Team names remain editable during play; saving settings clears undo history.

At the end of a set, choose Start next set; after the winning set, choose Finish match. New match asks for confirmation before clearing scores and completed sets, and preserves team names, match format, and side order.

Chrome on Android offers Add to Home screen. Offline caching is enabled only in production builds served over HTTPS or localhost; allow the first online visit to finish caching before going offline. The generated service worker caches the current build's JavaScript, CSS, and other assets.

Saved matches belong to the current browser and site address; they do not sync between devices or between development and production URLs. Clearing browser data removes saved scores. Undo history lasts only for the current page session.

## Contributing

Keep application changes in `src/`, static assets in `public/`, and automated checks in `test/`. Run `npm test` before submitting a change. For changes affecting layout or browser interactions, also check the production preview at phone and desktop widths.
