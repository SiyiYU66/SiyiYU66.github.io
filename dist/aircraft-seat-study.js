import {reportPreviews} from './report-previews.js';

// Definitive source: Siyi_Yu_Sustainable_Design_Engineering.pdf, 28 pages.
// Include covers and appendices, and preserve physical PDF order within each reel.
const report=reportPreviews.sustainable;
const media='./assets/projects/soft-signals/aircraft-seat/';
const submissions=[
  {
    label:'Submission 1', title:'Product & system analysis.',
    // Physical pages 1–14: nine analysis slides plus the cover and appendices.
    intro:'A teardown of an existing economy seat anchors the sustainability brief. Passenger and expert interviews, an eco audit and material-flow mapping connect comfort with product longevity and recovery. The analysis identifies difficult disassembly, mixed materials and weight in use as the key opportunities for redesign.',
    figures:report.pages.slice(0,14)
  },
  {
    label:'Submission 2', title:'Modular seat development.',
    // Physical pages 15–23: future scenario, architecture, CAD and service model.
    intro:'The research becomes a modular seat architecture: a long-lived primary frame, replaceable comfort layers and detachable accessories. CAD studies, assembly details, disassembly trees and eco audits explore how tessellating parts, quarter-turn fasteners and accessible connections can reduce material waste and make repair practical within a leasing and take-back model.',
    figures:report.pages.slice(14,23)
  },
  {
    label:'Submission 3', title:'Final concept & circular system.',
    // Physical pages 24–28: final proposal and its explicitly assumed future scenario.
    intro:'The final proposal brings recycled-aluminium structure, carbon-fibre backrests, TPU lattice cushioning and removable covers into one future-scenario design. A manufacturer-led leasing loop connects inspection, refurbishment and recovery. The report projects a 66% mass reduction and an ideal-system MCI of 0.80; these are concept-stage estimates awaiting validation.',
    figures:report.pages.slice(23,28)
  }
];

export const aircraftSeatProject={
  name:'Aircraft Seat',discTitle:'Aircraft Seat',discSubtitle:'MODULAR DESIGN / CIRCULAR SYSTEMS',
  year:'2025',category:'Sustainable Design Engineering',role:'Design & Sustainability Analysis',
  cover:media+'seat-concept.webp',coverInk:'#202320',
  coverCrop:{fit:'disc',zoom:.88,positionX:.5,positionY:.78,background:'#d9d9d9'},
  hero:media+'seat-concept.webp',heroFit:'contain',heroBackground:'#d9d9d9',
  heroAlt:'Final aircraft-seat concept: three upholstered seats on a modular lightweight frame',
  overview:'A lighter, modular aircraft seat within a circular service system',
  description:'A three-part study of aircraft seating, from disassembly and sustainability analysis to a modular seat concept and circular service model.',
  headline:'Designing the seat and the system.',
  lede:'Three submissions trace an aircraft seat from sustainability analysis to modular design and a circular product-service concept.',
  collection:'Academic Design Study',
  // The supplied Collins seat is the industry brief/reference product; this
  // does not imply a commissioned project or formal company partnership.
  credits:[['INDUSTRY BRIEF','Collins Aerospace'],['DESIGN','Sketching · CAD Modelling'],['ANALYSIS','Eco Audit · MCI · Flow Mapping']],
  caseStudy:{
    chapters:submissions,
    resourcesLabel:'Full report',
    links:[{label:'Download full report · PDF',href:report.href,download:report.filename}]
  }
};
