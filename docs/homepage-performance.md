# Homepage loading

The first scene previously waited for every project photograph and all 27
surface maps before it could start. About Me was also in the initial module
graph. These serial dependencies delayed the opening itself.

The homepage now prepares the selected disc and its immediate neighbours first.
Other discs load in the background, with their full original material attached
before they can be selected or copied into the next-project footer. The opening
starts independently and hands over only when that first view is ready.
Returning gallery visits do not fetch the opening portrait. About Me imports
its turntable when requested; its text remains immediately available.

The static Pages build bundles and fingerprints scripts and styles. Its shared
Three.js chunk is module-preloaded. Fonts are preloaded WOFF2 conversions with
identical outlines, metrics and glyph coverage. All three project surface maps,
the opening portrait and two PNG covers use lossless WebP at their original
dimensions. See `lossless-web-assets.json` for byte and decoded-pixel checks.
Original masters remain in the repository. Lighting, material constants,
geometry, camera, typography and motion curves are unchanged.
`scripts/prepare-web-assets.mjs` recreates these web formats from those masters
on a clean checkout, with decoded-pixel and font-table checks on every build.

## Controlled local measurement

No-cache tests used the same aggregate 5 Mbit/s connection and 80 ms response
latency, with the original and updated build on the same browser and machine.
The original gallery became ready at about 33.3 seconds; the updated initial
gallery at about 9.4 seconds (about 72% less wait). On a first visit the updated
opening became visible at about 5.3 seconds while gallery assets continued
loading. These are controlled test results, not guarantees for every network.

The original 136 checks pass. Browser verification covers the opening, gallery,
side-disc selection, project opening, melting reveal, return selection and the
lazy About Me page. Existing reports, game routes and the online service are
retained. Publish updates by pushing `main`; the existing Pages workflow runs
checks and builds the new fingerprinted frontend.
