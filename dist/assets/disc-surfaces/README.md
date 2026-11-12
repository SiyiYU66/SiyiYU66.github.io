# Projects / printed disc surface study

Applied to all six project discs with the approved UROP finish parameters.
UROP now uses the user's supplied photograph from `assets/projects/urop/`.
The other five retain their existing generated cover artwork until photographs
are provided. The generator never alters color artwork. Every disc shares the
same ring pitch, grain size, metal response and rounded edge profile. Each stable
project ID seeds its own grain, two edge marks and three shallow creases.
Camera, room environment, lights, queue spacing, marker and approved hover
response are retained.

`<projectId>/*.png` are offline data maps, copied by `npm run build` to
`dist/assets/disc-surfaces/`. They are loaded once before the collection renders.
There is no procedural texture painting or texture upload inside the frame loop.

- `normal.png`: concentric micro-normal at 8.5px pitch + 4px correlated grain,
  two edge marks and three seeded, shallow coating creases
- `roughness.png`: printed-surface response
- `coat-roughness.png`: coating response to the existing environment reflection
- `manifest.json`: reproducible seed, two scratches and three crease locations

Generate deliberately, when changing the study, with
`python scripts/generate-disc-surface.py <projectId>` (requires NumPy and Pillow).
Omitting the ID selects UROP's stable legacy ID, `between-spaces`.
Ordinary builds use the committed PNGs and do not need Python.
Material strength is centralized in `dist/disc-surface.js`.
The physical edge bevel is `studyBevel` in `dist/disc-config.js`, built as a
rounded revolved profile in `dist/disc-geometry.js`. It joins both faces while
retaining the existing disc diameter and 0.028-unit thickness.

The row loads each project's maps once into an ID-keyed model collection.
Detail opening/closing deactivates/reactivates that collection without replacing
its textures, materials or crease layout. Reloading uses the same static PNGs.

The normal Projects route uses the finish by default. The local-only URL
`/?surface-review=1` mounts Before / After and an explicitly labelled automatic
pointer sweep on the real Projects scene. It pauses only the slow idle spin for
matching comparisons; cover, camera, lights, browsing distance, hover raycast and
all other interactions remain the same. The comparison swaps two materials that
share the exact same color texture. These review controls are not mounted on the
normal or hosted site.
