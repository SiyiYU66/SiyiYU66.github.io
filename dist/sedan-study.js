import {reportPreviews} from './report-previews.js';
// Sedan keeps the original slow-forms record ID and disc artwork.
const media = './assets/projects/slow-forms/study/';
const improvementFigures = new Set(['development-09', 'development-10', 'development-11']);
const figure = (name, width, height, caption, wide = false) => ({
  src: `${media}${name}.png`, width, height, caption, wide,
  // Match the actual #111c35 background baked into the first eight sketches.
  ...(improvementFigures.has(name) ? {background: '#111c35', darkSurface: true, viewerSurface: 'navy'} : {})
});

export const sedanHero = {
  hero: `${media}hero.png`,
  heroAlt: 'Three-quarter view of the amber sedan model',
  heroFit: 'contain'
};

export const sedanStudy = {
  chapters: [
    {
      label: 'Design brief',
      title: 'A sedan for sustained motorway use',
      intro: 'The brief was to make an electric sedan more efficient at motorway speeds using passive changes to the body and underfloor.',
      notes: [
        ['Rear body', 'Keep flow attached farther down the rear slope to improve base pressure.'],
        ['Underfloor', 'Guide air into the diffuser with a smoother transition.'],
        ['Passive geometry', 'Build the flow controls into the body without adding moving aero parts.'],
        ['Wake control', 'Reduce the wake’s sensitivity to changes in speed and crosswinds.']
      ]
    },
    {
      label: 'Sketch to CAD',
      title: 'Eight ways to guide the air',
      intro: 'The sketches explored roof profiles, wheel wakes and underbody treatments. The final sketches identify where to refine the roof, diffuser and rear taper before modelling the body in Fusion 360.',
      figures: [
        figure('development-01', 1152, 684, 'Concept 01 · Passive body and underfloor'),
        figure('development-02', 1152, 684, 'Concept 02 · Active, side and wheel features'),
        figure('development-03', 720, 430, 'Concept 03 · Wheel wake'),
        figure('development-04', 720, 430, 'Concept 04 · Upper body and underfloor'),
        figure('development-05', 722, 430, 'Concept 05 · Balanced features'),
        figure('development-06', 720, 430, 'Concept 06 · Aerofoil profile'),
        figure('development-07', 734, 430, 'Concept 07 · Venturi underbody'),
        figure('development-08', 722, 430, 'Concept 08 · Balanced features'),
        figure('development-09', 840, 354, 'Refinement sketch · Roof curvature and taper'),
        figure('development-10', 840, 370, 'Refinement sketch · Ride height and diffuser'),
        figure('development-11', 860, 380, 'Refinement sketch · Plan view and rear profile')
      ]
    },
    {
      label: 'CFD / Iteration 01',
      title: 'Where the baseline lost efficiency',
      intro: 'The first ANSYS Fluent run showed high pressure at the bumper and wheels. Flow separated early at the rear, leaving a broad wake. Over the roof, faster flow lowered pressure and contributed to lift.',
      figures: [
        figure('baseline-board', 2048, 1812, 'Baseline CAD · Front and rear three-quarter views', true),
        figure('baseline-01', 788, 420, 'Baseline · Surface pressure'),
        figure('baseline-02', 1068, 420, 'Baseline · Velocity streamlines'),
        figure('baseline-03', 1030, 420, 'Baseline · Pressure contour'),
        figure('baseline-04', 1016, 420, 'Baseline · Velocity contour')
      ]
    },
    {
      label: 'CFD / Iteration 02',
      title: 'Refining the body, shrinking the wake',
      intro: 'A lower bonnet and roof reduced frontal area by about 2%. Removing the front guides reduced local pressure build-up; a shorter rear and smoother taper helped the flow stay attached longer.',
      // Page 14 of the linked report resolves conflicting values in the source site's mobile markup.
      results: {
        caption: 'ANSYS Fluent results',
        columns: ['Measure', 'Baseline', 'Refined'],
        rows: [
          ['Drag coefficient (Cd)', '0.3823', '0.3462'],
          ['Lift coefficient (Cl)', '0.0887', '0.0812']
        ]
      },
      figures: [
        figure('refined-board', 2048, 1812, 'Refined CAD · Front and rear three-quarter views', true),
        figure('refined-01', 2030, 834, 'Refined design · Surface pressure'),
        figure('refined-02', 1156, 512, 'Refined design · Velocity streamlines'),
        figure('refined-03', 2156, 841, 'Refined design · Pressure contour'),
        figure('refined-04', 1840, 740, 'Refined design · Velocity contour')
      ]
    }
  ],
  resourcesLabel: 'Full report',
  links: [
    {label: 'Download full report · PDF', href: reportPreviews.sedan.href, download: reportPreviews.sedan.filename}
  ],
  report: reportPreviews.sedan
};
