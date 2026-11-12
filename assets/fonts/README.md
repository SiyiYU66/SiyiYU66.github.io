# Font sources

`personal-preview/` contains user-supplied personal-use trial OTF files and their
original EULA. It is ignored by Git and never copied into `dist` or deployments.
`npm run dev` serves these only on the loopback preview through `/__preview/fonts/`.
Rebuilding with `npm run build` does not remove the local preview source files.

The supplied May 2021 EULA, section 2.1 (Free License), excludes publicly available
websites. These downloads are not treated as website publishing licenses.

Inspected trial files:

- Eiko: Thin (100), Medium (500), Heavy (900), Light Italic (300), Black Italic (900).
  Upright Light (300) is absent. Per the user's choice, the local trial uses actual
  Eiko Medium (500).
- Neue Montreal: Hairline (100), Light (300), Regular (400), Semibold (600),
  Extrabold (800), plus italics; Text Book and Book Italic have internal weight 350.
  The local Text Book face is mapped to CSS 375 for the requested layout. Its
  outlines and internal metadata are unchanged; it is not the missing Display Book.
- Museum: Light (300), Regular (400), Ultrabold (800), plus italics.
  Local labels use Regular (400).

When appropriately licensed webfonts are supplied, place them in `licensed/`:

- `PPEiko-Light.woff2` — upright Light, 300
- `PPNeueMontreal-Book.woff2` — Book, CSS 375
- `PPMuseum-Regular.woff2` — Regular, 400

`npm run build` copies those sources to `dist/assets/fonts/` and generates font
availability. `dist/typography.js` is the central DOM and Canvas font configuration;
artwork is created only after its awaited font loading completes.
