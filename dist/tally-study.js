// Curated from https://suryansha.com/projects/tally.
// Team work; the source author's identity and film credits remain explicit.
const media = './assets/projects/in-motion/study/';
const figure = (name, width, height, caption, wide = false, background) => ({
  src: `${media}${name}`, width, height, caption, wide, ...(background ? {background} : {})
});
// These original WebPs already contain alpha. Only their displayed ink colour
// changes with the room theme; the source strokes are never redrawn or edited.
const sketch = (name, width, height, caption) => ({
  ...figure(name, width, height, caption), inkDrawing: true, borderless: true
});

export const tallyHero = {
  hero: `${media}cover.webp`,
  heroAlt: 'Tally tactile keypad, payment bell and companion interface arranged on a market counter',
  heroFit: 'contain'
};

export const tallyMetadata = {
  name: 'Tally',
  discTitle: 'Tally',
  discSubtitle: 'TACTILE PAYMENTS · COUNT ON IT',
  year: '2026',
  category: 'Industrial Design / User-Centred Design',
  role: 'CIO / Information',
  cover: `${media}cover.webp`,
  coverCrop: {zoom: 1, positionX: .38, positionY: .5},
  overview: 'A tactile, modular point-of-sale system shaped around market traders',
  description: 'Physical keys and clear payment feedback bring confidence to a busy market counter.',
  headline: 'Confidence in every transaction.',
  lede: 'A modular point-of-sale system for outdoor food markets. User research shaped its tactile controls, physical form and payment feedback, developed through prototypes, CAD and product visualisation.',
  collection: 'Industrial Design',
  credits: [
    ['CIO', 'Siyi Yu'],
    ['CCO', 'Suryansha Sheth'],
    ['CTO', 'Hamish McNeill'],
    ['COO', 'Kaiyu Gaunt']
  ]
};

export const tallyStudy = {
  chapters: [
    {
      label: 'User-led design',
      title: 'Confidence at a busy counter.',
      intro: 'Eleven interviews across three food markets revealed divided attention, glare and uncertainty around payments. Co-design with bakery trader Laurence focused the brief: make each input tangible and each completed payment unmistakable.',
      notes: [
        ['A familiar layout', 'Product categories follow the trader’s mental model; the modular grid adapts as the menu changes.'],
        ['Clear feedback', 'A firm click confirms an input. A bell and rising flag communicate payment completion.']
      ],
      figures: [
        figure('co-design.webp', 2384, 1298, 'Co-design with Laurence at the Southbank Centre food market', true)
      ]
    },
    {
      label: 'Form & assembly',
      title: 'Keys, base and bell.',
      intro: 'CAD and exploded assemblies resolve three parts into one coherent product. Magnets locate the movable keys; pogo pins connect them to the base. Product renders bring the proportions, colour and assembly details together in the market setting.',
      figures: [
        figure('exploded-views.webp', 2384, 1376, 'CAD & assembly · Key module, modular base and payment-confirmation unit', true, '#f4eee2'),
        figure('final-renders.webp', 4311, 2184, 'Product visualisation · The complete Tally system at the counter', true)
      ]
    },
    {
      label: 'Tactile interaction',
      title: 'Let the hand find its way.',
      intro: 'Switch trials favoured a firm, audible click. LED feedback makes quantities visible, while a split cap explores a second input for larger orders. Size, a tapered gap, texture and colour distinguish the controls by touch and peripheral vision.',
      figures: [
        sketch('quantity-dial.webp', 1574, 807, 'Feedback exploration · Mechanical quantity dial'),
        sketch('rotary-cap.webp', 444, 240, 'Input exploration · Rotary control'),
        sketch('split-cap-sketch.webp', 940, 581, 'Form exploration · Primary and secondary cap surfaces'),
        figure('quantity-led.webp', 993, 1029, 'Physical prototype · LED quantity feedback'),
        figure('tapered-cap.webp', 942, 588, 'Physical detail · Tapered gap and differentiated controls')
      ]
    },
    {
      label: 'Identity & packaging',
      title: 'Count on it.',
      intro: 'The tally mark connects a physical record of a sale with a playful product identity. Packaging separates Keys and Bell into a clear family, with a quick-start guide that carries the same visual language from unboxing to setup.',
      figures: [
        figure('packaging.webp', 4320, 3339, 'Packaging · Tally Keys, Tally Bell and quick-start guide', true),
        figure('posters.webp', 4320, 2877, 'Visual identity · The Tally mark in a shopfront setting', true)
      ]
    },
    {
      label: 'In context',
      title: 'Shaped with the person using it.',
      intro: 'An early sticky-note trial reported a 75% improvement using physical targets. Co-design then grounded the form and feedback in Laurence’s stall. The next step is a broader, complete-system trial during busy service.',
      figures: [
        figure('in-use.webp', 1666, 1736, 'In context · Tally’s keypad on Laurence’s bakery counter', true)
      ],
      notes: [
        ['Project', 'A six-month college project by Siyi Yu, Suryansha Sheth, Hamish McNeill and Kaiyu Gaunt.'],
        ['Credits', 'Concept direction, early prototypes, identity and films: Suryansha Sheth. CAD and product renders: Tally project team.']
      ]
    }
  ],
  resourcesLabel: 'Films & project credits',
  links: [
    {label: 'Watch the final film · Suryansha Sheth', href: 'https://www.youtube.com/watch?v=ZbQ81tp5KtI'},
    {label: 'Watch the visual and sonic identity', href: 'https://www.youtube.com/watch?v=QGgk8Qvl0Mc'},
    {label: 'Original case study · Suryansha Sheth', href: 'https://suryansha.com/projects/tally'}
  ]
};
