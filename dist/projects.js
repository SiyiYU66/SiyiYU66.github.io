import {uropProject} from './urop-study.js';
import {sustainableProject,feaProject} from './coursework-studies.js';
// Stable IDs and existing stories are retained. Archive studies remain demos,
// without invented project dates, clients or professional roles.
import {sedanHero, sedanStudy} from './sedan-study.js';
import {batteryHero, batteryStudy} from './battery-study.js';
import {tallyHero, tallyMetadata, tallyStudy} from './tally-study.js';
import {ichackHero, ichackMetadata, ichackStudy} from './ichack-study.js';
import {segwayProject} from './segway-study.js';

export const projects = [
  {
    id: 'between-spaces',
    name: 'UROP-Undergraduate Research Oppotunity Programme',
    year: '2026',
    category: 'Software Engineering / Biomechanical Simulation',
    role: 'Undergraduate Researcher',
    art: 0,
    cover: './assets/projects/urop/urop-cover.jpg',
    coverCrop: {zoom: 1, positionX: .2, positionY: .5},
    discTitle: 'UROP',
    discSubtitle: 'UNDERGRADUATE RESEARCH',
    demo: false,
    ...uropProject
  },
  {
    id: 'slow-forms',
    name: 'Sedan Redesign',
    year: '2026',
    category: 'Mechanical Design / Aerodynamics',
    role: 'Individual Project',
    art: 1,
    cover: './assets/projects/slow-forms/cover.webp',
    coverCrop: {fit: 'disc', zoom: .96, background: '#0a0a0a'},
    ...sedanHero,
    demo: false,
    overview: 'A CFD-led redesign of an electric sedan for motorway use',
    description: 'An aerodynamic study of an electric sedan using sketches, CAD and two rounds of CFD.',
    headline: 'Shaping a lower-drag sedan.',
    lede: 'An aerodynamic redesign for sustained motorway driving. Sketches, CAD and two ANSYS Fluent simulations show how passive changes to the body affect drag and lift.',
    collection: 'Engineering Study',
    credits: [
      ['TIMELINE', '6 weeks'],
      ['TOOLKIT', 'Fusion 360 · ANSYS Fluent · 3D printing']
    ],
    caseStudy: sedanStudy
  },
  {
    id: 'a-quiet-place',
    name: 'Battery Cold Plate',
    year: '2026',
    category: 'Thermal Management / CFD',
    role: 'Team Project (4 Members)',
    art: 2,
    cover: './assets/projects/a-quiet-place/cover.webp',
    coverCrop: {fit: 'disc', zoom: .96, background: '#0a0a0a'},
    ...batteryHero,
    demo: false,
    overview: 'Optimising an EV cold plate for even cooling and lower pressure loss',
    description: 'A two-stage CFD study of an aluminium liquid-cooling plate for EV batteries.',
    headline: 'Cooling the pack, balancing the flow.',
    lede: 'A four-week study of an EV battery cold plate. Two channel designs explore the balance between temperature uniformity, pressure loss and pumping effort.',
    collection: 'Engineering Study',
    credits: [
      ['TIMELINE', '4 weeks'],
      ['TOOLKIT', 'SolidWorks · ANSYS Discovery · Figma']
    ],
    caseStudy: batteryStudy
  },
  {
    id: 'in-motion',
    art: 3,
    demo: false,
    ...tallyMetadata,
    ...tallyHero,
    caseStudy: tallyStudy
  },
  {id:'soft-signals',art:4,demo:false,...sustainableProject},
  {id:'common-ground',art:5,demo:false,...feaProject},
  {
    id: 'ichack',
    art: 6,
    demo: false,
    ...ichackMetadata,
    ...ichackHero,
    caseStudy: ichackStudy
  },
  {
    id:'battleship',art:7,demo:false,name:'Battleship',discTitle:'Battleship',discSubtitle:'TACTICAL NAVAL WARFARE',year:'2026',
    category:'Game Development / JavaScript',role:'Designer & Developer',
    cover:'./assets/games/battleship/assets/background pic.webp',coverCrop:{zoom:1,positionX:.5,positionY:.5},
    hero:'./assets/games/battleship/assets/background pic.webp',heroAlt:'Orange and blue naval fleets facing one another across the ocean',
    overview:'A browser-based naval strategy game with AI and multiplayer modes',
    description:'A functional Battleship engine with cinematic UI, three AI difficulties, same-device play and room-code multiplayer.',
    headline:'Command the ocean.',lede:'A Computing 2 game project by Siyi Yu. Deploy your fleet, read the battlefield and outmanoeuvre your opponent.',
    sections:[],game:'./assets/games/battleship/index.html'
  },
  segwayProject
]
