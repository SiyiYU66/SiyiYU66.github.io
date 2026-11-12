# UROP cover photograph

`urop-cover.jpg` is the user's supplied photograph, retained without image edits.
`npm run build` copies it to `dist/assets/projects/urop/urop-cover.jpg`.

The existing UROP record in `dist/projects.js` owns:

- `cover`: the image path
- `coverCrop`: independent zoom and horizontal/vertical crop positions
- `discTitle`: the short printed title (the metadata title stays unchanged)

`preloadProjectCovers()` decodes the photograph before the Three.js collection is
created. `project-media.js` crops it to a cached square Canvas; the disc's existing
geometry clips it into a circle. The adjustable crop puts the principal sculpture
to one side of the centre opening. The printed lettering is generated after
fonts are ready, in the existing disc cover builder.
