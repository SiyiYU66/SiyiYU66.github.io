import {reportPreviews} from './report-previews.js';
// Source case study: https://ikemenebeli.com/projects/battery
const media = './assets/projects/a-quiet-place/study/';
const figure = (name, width, height, caption, wide = false) => ({
  src: `${media}${name}.png`, width, height, caption, wide,
  // These original PNGs contain transparent areas and white engineering labels.
  // Keep the approved dark-room backing in both themes, without filtering data.
  background: '#171512', darkSurface: true
});

export const batteryHero = {
  hero: `${media}hero.png`,
  heroAlt: 'Cutaway CAD view of the aluminium cold plate and its serpentine coolant channel',
  heroFit: 'contain',
  heroBackground: '#171512'
};

export const batteryStudy = {
  chapters: [
    {
      label: 'Design brief',
      title: 'Keeping the battery temperature even',
      intro: 'Design an aluminium liquid-cooling plate for an EV battery pack. Computational analysis was used to balance temperature uniformity against the pressure loss that the pump must overcome.',
      notes: [
        ['Thermal performance', 'Spread cooling across the plate rather than leaving a strong channel pattern.'],
        ['Hydraulic performance', 'Reduce pressure losses at the inlet and channel bends.']
      ]
    },
    {
      label: 'Iteration 01',
      title: 'A serpentine starting point',
      intro: 'The first design used a winding channel with tighter spacing downstream. Inlet impingement and bends produced a 640 Pa pressure drop. Cooling reached 46°C at the hottest point, but the plate showed uneven temperatures and a visible channel imprint.',
      figures: [
        figure('initial-design', 1098, 406, 'Initial layout · Channel spacing, bend radius and inlet', true),
        figure('initial-02', 906, 516, 'Initial design · Top-surface temperature'),
        figure('initial-03', 1034, 516, 'Initial design · Underside temperature distribution'),
        figure('initial-05', 946, 394, 'Initial design · Channel pressure'),
        figure('initial-07', 906, 437, 'Initial design · Coolant velocity vectors')
      ]
    },
    {
      label: 'Iteration 02',
      title: 'Guiding a smoother flow',
      intro: 'A split inlet, wider downstream channel and surface dimples changed the flow distribution. Pressure loss fell to 236 Pa and peak velocity to 0.34 m/s. The underside became more uniform, while the peak temperature rose to 49°C.',
      figures: [
        figure('refined-design', 1261, 472, 'Refined layout · Split inlet, dimples and tapered channel', true),
        figure('refined-02', 1057, 516, 'Refined design · Top-surface temperature'),
        figure('refined-03', 1161, 516, 'Refined design · Underside temperature distribution'),
        figure('refined-05', 968, 392, 'Refined design · Channel pressure'),
        figure('refined-07', 1092, 427, 'Refined design · Coolant velocity vectors')
      ]
    },
    {
      label: 'Results',
      title: 'A thermal and hydraulic trade-off',
      intro: 'The revised geometry reduced pressure drop by approximately 63%. The comparison captures the trade-off between easier pumping, more even cooling and a higher maximum temperature.',
      results: {
        caption: 'CFD comparison',
        columns: ['Measure', 'Initial', 'Refined'],
        rows: [
          ['Pressure drop', '640 Pa', '236 Pa'],
          ['Peak coolant velocity', '0.61 m/s', '0.34 m/s'],
          ['Peak temperature', '46°C', '49°C']
        ]
      }
    }
  ],
  resourcesLabel: 'Full report',
  links: [
    {label: 'Download full report · PDF', href: reportPreviews.battery.href, download: reportPreviews.battery.filename}
  ],
  report: reportPreviews.battery
};
