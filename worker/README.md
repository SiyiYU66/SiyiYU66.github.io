# Battleship online rooms

The portfolio now has a Worker backend instead of a static-only deployment.
Frontend source remains under `dist/`; editable game source is in
`assets/games/battleship/`. `npm run build` copies the frontend to `dist/client/`
and prepares the server under `dist/server/`, keeping the existing fonts and
precomputed disc textures. It does not run the old font-evaluation vendor build.

The Worker serves the frontend through the `ASSETS` binding and routes
`/api/battleship/*` to `room-api.js`. The hosting manifest declares the managed
D1 binding `DB`. The schema-only migration in `drizzle/` is applied by Sites
when publishing. Do not edit a migration after it has been published.

Room state, authenticated seat tokens, event cursors and idempotent action IDs
are persisted in D1. Board placement, turn order, shots, Sonar and Ghost Move
use the original pure game engine. Compare-and-swap revisions prevent concurrent
actions from consuming the same turn. Idle rooms expire after four hours.

`room-client.js` preserves the original game's event interface over same-origin
HTTPS, polling active rooms about twice a second. It queues outgoing placement
actions and incoming battle effects so a delayed response or animation cannot
lose or duplicate a shot. The original Socket.IO Node server is retained as
historical source, but is no longer required by the deployed game.

For local work, run `npm run build` and then `npm run dev` with Node 24 or later.
The preview uses an in-memory SQLite database with the same SQL schema and API.
Stopping the local server clears local test rooms; the hosted D1 database is
separate and persistent. Run `npm run check` for the project checks, including
two-client API, authorization, incomplete deployment, concurrent turn,
idempotency, special move and expiry tests.

Mobile styles are centralized in `assets/games/battleship/responsive.css`.
The old `mobile.css` is retained but no longer linked. Board tables are CSS
grids with ten explicit columns and rows, and both direct `tr` children and
optional `tbody` wrappers flatten into the same layout. This avoids relying
on table row sizing or table `aspect-ratio` behavior. The five ship cards also
use an explicit grid, and each original DOM row remains available to the engine.

The portfolio's Start in landscape button launches `arena.html`. This host keeps
one 1280 x 720 game iframe, plus a 48px control bar, for menu, deployment, AI and
online play. `arena-layout.js` fits that complete 5:3 surface into the available
safe area without rotating the interactive iframe. Portrait touchscreens first
show a Rotate your phone prompt; the game is loaded only after physical landscape
orientation. Returning to portrait covers the existing match until landscape
returns. Native fullscreen is optional. The host uses layout zoom without an
iframe transform matrix. Exit requires a matching press on its own button or
focused keyboard activation, preventing stray click events from closing play.

Phone launches navigate to a standalone arena document in the same tab. The
portfolio releases its gallery renderer and textures before navigation; returning
through the browser's page cache reloads the portfolio safely. This avoids a
rotated nested iframe and retaining the gallery's WebGL allocation behind the
game. Phone Exit returns to the project. Desktop embeds retain minimize/Resume.

`screen.css` contains structural fit and stable-hit-target rules only. The
original theme CSS still determines typography, icons, roster, materials,
coordinates and HUD. Explicit TBODY/TR tracks and reserved confirmation-button
space avoid collapsed grids and moving controls. Cell highlights use color and
glow rather than translating/scaling hit targets. Touch input bypasses synthetic
hover previews; keyboard focus uses preventScroll. Direct links use the same host. The original
mobile rules remain available to legacy embeds; they do not determine the
landscape host layout. `game-fonts.css` bundles the existing Orbitron and Chakra
Petch faces from Google Fonts under their accompanying SIL Open Font Licenses.
The room API and tokens are shared across PC and mobile; screen size has no
effect on game state or matchmaking.
