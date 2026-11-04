# Courtside

A phone-friendly volleyball scoreboard for the web, with large scores and touch controls. Includes editable team names, serving selection, undo, side swapping, match settings, set tracking and confirmed new match reset. Scores save in this browser after every action.

## Build and check

The phone website needs Node.js. The macOS preview also needs Rust/Cargo and the Swift compiler provided by Apple's command line tools. No package dependencies need to be downloaded; Rust supplies the entry point Craft Anything uses to launch the shared web scoreboard.

```
sh build.sh
node web-check.mjs
```

Alternatively, run `npm run build` and `npm test`. The build creates the static website in `dist/` from `web/` and a macOS preview at `target/debug/courtside`. The preview displays those same website files and supports `--screenshot <file.png>` for the startup check. To build only the website, run `node build-web.mjs`. The checks cover scoring, serving, undo, deuce, set transitions, deciding sets, match completion, reset, swapping, saved-score reload and generated files.

## Use on a phone

Publish the contents of `dist/` to an HTTPS static host and open that hosted URL in the phone's browser. This project does not include a deployed URL. A computer's localhost URL is not reachable from a phone.

On Android, Chrome's menu offers Add to Home screen. Once loaded and cached over HTTPS, the app can reopen offline. Both team scores stay side by side on narrow screens. Clearing browser data removes saved scores; undo history lasts for the current page session.

The layout follows the supplied screenshot: a dark background, white score cards, oversized black scores, and mint and coral point buttons. Default format is best of three, 21 points per set, deciding set to 15, all sets won by two. Best of five and 25/15/11-point sets are available before the first point through Match settings. For 15-point matches, the deciding set is played to 11; 11-point matches use 11 for every set. At the end of a set choose Start next set; after the winning set choose Finish match.
