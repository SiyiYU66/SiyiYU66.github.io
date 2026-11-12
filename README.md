# Listening Room — Siyi Yu

Design engineering portfolio: **https://siyiyu66.github.io/**

## Editing

| Content | Source |
| --- | --- |
| Project order and shared project data | `dist/projects.js` |
| UROP story, Gallery title and research credits | `dist/urop-study.js` |
| Aircraft Seat and its three submissions | `dist/aircraft-seat-study.js` |
| Running Blade | `dist/coursework-studies.js` |
| Other case studies | `dist/*-study.js` |
| Project photographs and source artwork | `assets/projects/` |
| Opening portrait | `assets/opening/` |
| Fonts and layout | `dist/style.css`, `dist/theme.css`, `dist/typography.js` |

Commit changes to **main**. GitHub Actions checks, builds and publishes the
website automatically. The address stays the same; visitors see the new
deployment when they open or refresh it. Saving a local file alone does not
publish it.

## Local preview

Use Node.js 24 or later:

```
npm run build
npm run dev
```

The local preview uses port 4173. `.pages-output/` is the static Pages output.
Generated client/server folders and local credentials are ignored by Git.

## Online Battleship

The frontend is served by GitHub Pages. Persistent multiplayer rooms continue
to use the existing Listening Room HTTPS service and D1 database. Its exact
origin allowlist includes this Pages site, with the original player-token
checks preserved. Keep that service online for multiplayer.

## Source provenance

The initial portfolio source matches verified Listening Room release 28.
Original images, fonts, report parts and movies are checked against the
SHA-256 manifest in `hosting/source-assets.json` during the initial import.
No login tokens, Sites identity files or local runtime data are included.
