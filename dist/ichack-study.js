const media = './assets/projects/ichack/';
const figure = (file, width, height, caption, wide = false) => ({
  src: `${media}${file}`, width, height, caption, wide
});

export const ichackHero = {
  hero: `${media}cover-1600.avif`,
  heroAlt: 'IC Hack 2026 opening keynote, with the event identity projected above the audience',
  heroFit: 'contain'
};

export const ichackMetadata = {
  name: 'ICHACK',
  discTitle: 'ICHACK',
  discSubtitle: 'IC HACK 26 · BRAND IDENTITY',
  year: '2026',
  category: 'Branding / Merchandise Design',
  role: 'Graphic Design / Brand Kit Selection',
  cover: `${media}cover-1600.avif`,
  coverCrop: {zoom: 1, positionX: .85, positionY: .5},
  overview: 'A fantasy-themed identity for a 48-hour student hackathon',
  description: 'An event identity spanning typography, colour, spatial themes and role-specific merchandise.',
  headline: 'A world built for 48 hours.',
  lede: 'An identity system for IC Hack 26, extending a fantasy theme across the live event, its spaces and the clothing worn by its community.',
  collection: 'Event Identity',
  credits: [
    ['EVENT', 'IC Hack 26'],
    ['DATE', 'January 2026']
  ]
};

export const ichackStudy = {
  chapters: [
    {
      label: 'Challenge',
      title: 'One identity for a live weekend',
      intro: 'The system was designed for more than 900 attendees over a 48-hour event. Fantasy and fairytale became the shared theme, connecting digital communications with physical spaces and merchandise.',
      figures: [
        figure('problem-themed.svg', 1067, 406, 'The event identity brief', true)
      ]
    },
    {
      label: 'Type & colour',
      title: 'A bookish character, a flexible palette',
      intro: 'Junicode and Ysabeau established the typographic pairing, with a textured wordmark adding an older character. Three core colours identify the hackspaces, while a fourth covers the wider event. Additional shades extend the palette across applications.',
      figures: [
        figure('fonts-v2-themed.svg', 509, 384, 'Junicode and Ysabeau type pairing'),
        figure('colours-1.svg', 610, 260, 'Colour palette · Red and purple'),
        figure('colours-2.svg', 610, 259, 'Colour palette · Blue and green')
      ]
    },
    {
      label: 'Applied identity',
      title: 'Biomes, roles and wearable graphics',
      intro: 'The existing logo was adapted with forest, mountain and underwater imagery. Two base shirt colours and larger graphics distinguish participants from event staff. Lanyards repeat each role’s colour and landscape, with an arched label linking them to the shirts.',
      figures: [
        {...figure('logo-1600.avif', 1600, 517, 'Logo variants and fantasy environments', true), background: '#eeeae4'},
        figure('tshirtgraphics-1600.avif', 1600, 1063, 'Front and back T-shirt graphics by event role', true),
        figure('lanyards-1600.avif', 1600, 1110, 'Role-specific lanyard designs', true),
        figure('tshirts-photo-1-1600.avif', 1600, 1067, 'Printed T-shirts · Role graphics'),
        figure('tshirts-photo-2-1600.avif', 1600, 1067, 'Printed T-shirts · Logo graphics'),
        figure('tshirts-photo-3-1600.avif', 1600, 1067, 'Printed T-shirts · Folded collection')
      ]
    },
    {
      label: 'Live event',
      title: 'The identity in use',
      intro: 'The rollout carried the visual system into clothing, event spaces and smaller touchpoints. The photographs document the branding in use throughout the weekend.',
      figures: [
        figure('group-photo-1600.avif', 1600, 1067, 'The IC Hack 26 community', true),
        figure('in-environment-1600.avif', 1600, 1067, 'Event identity in the live environment'),
        figure('cupcakes-1600.avif', 1600, 2400, 'Branded cupcakes at the event'),
        figure('tshirts-give-out-1600.avif', 1600, 2400, 'T-shirt distribution during the event')
      ]
    }
  ],
  links: []
};
