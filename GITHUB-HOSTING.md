# GitHub Pages hosting

Account: SiyiYU66. Repository: SiyiYU66.github.io.
Address: https://siyiyu66.github.io/

The Pages source is GitHub Actions. The workflow checks and publishes main.
The static build uses scripts/build-github-pages.mjs, then
scripts/export-github-pages.mjs. PDF and video routes are materialised with
their original bytes and checksums. Server credentials are not needed.

Online Battleship continues to use the existing Listening Room room service;
the static exporter sets that public API address in the built game client.
The backend accepts the exact Pages origin and preserves bearer-token checks.

For another Pages account or a custom domain, update worker/hosting-config.js
and the backend allowlist together before changing the frontend API origin.
