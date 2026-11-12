import test from 'node:test';
import assert from 'node:assert/strict';
import {feaProject, sustainableProject} from '../dist/coursework-studies.js';
import {reportPreviews} from '../dist/report-previews.js';
import {reports} from '../worker/report-manifest.js';

test('Running Blade downloads the definitive FEA report without the obsolete route', () => {
  const report = reportPreviews.fea;
  assert.equal(report.filename, 'FEA_Siyi_Yu.pdf');
  assert.equal(report.href, '/downloads/FEA_Siyi_Yu.pdf');
  assert.equal(report.pages.length, 18);
  assert.equal(reports[report.href].size, 1094054);
  assert.equal(reports[report.href].sha256, '7dc9f17be0220d6cddf0770c5bd4caad850489721b9e476ba28c7f5b0e1e3e7f');
  assert.equal(reports['/downloads/Siyi_Yu_Running_Blade_FEA.pdf'], undefined);
});

test('coursework pages occur once in their intended report reels, with direct original-PDF downloads', () => {
  for (const [project, report] of [[sustainableProject, reportPreviews.sustainable], [feaProject, reportPreviews.fea]]) {
    const study = project.caseStudy;
    assert.equal(study.chapters.length, project===sustainableProject?3:6);
    assert.equal(study.resourcesLabel, 'Full report');
    assert.deepEqual(study.links, [{label: 'Download full report · PDF', href: report.href, download: report.filename}]);
    if (project === sustainableProject) {
      assert.equal(study.report, undefined, 'Do not repeat the submissions below the three introduced reels');
      assert.deepEqual(study.chapters.flatMap(chapter => chapter.figures), report.pages);
      assert.deepEqual(study.chapters.map(chapter => chapter.label), ['Submission 1', 'Submission 2', 'Submission 3']);
      for (const chapter of study.chapters) assert.ok(chapter.intro.split(/\s+/).length <= 65, 'Keep each submission introduction brief');
      continue;
    }
    assert.equal(study.report.href, report.href);
    assert.deepEqual(study.report.pages, report.pages);
    for (const chapter of study.chapters) {
      assert.ok(chapter.intro, 'Keep the chapter narrative');
      for (const figure of chapter.figures || []) {
        assert.doesNotMatch(figure.src, /\/page-\d+\./, 'Full report pages belong in the report section');
      }
    }
  }
});

test('Aircraft Seat follows all three definitive submissions without stale concept copy or omitted report pages',()=>{
  assert.equal(sustainableProject.name,'Aircraft Seat');
  assert.doesNotMatch(JSON.stringify(sustainableProject),/BEADFLOW|refill|passport|0\.60|225 tonnes/i);
  assert.match(sustainableProject.cover,/aircraft-seat\/seat-concept\.webp$/);
  const groups=sustainableProject.caseStudy.chapters;
  assert.deepEqual(groups.map(g=>g.figures.map(p=>p.page)),[
    Array.from({length:14},(_,i)=>i+1),
    Array.from({length:9},(_,i)=>i+15),
    Array.from({length:5},(_,i)=>i+24)
  ]);
  assert.deepEqual(groups.flatMap(g=>g.figures),reportPreviews.sustainable.pages);
  const final=sustainableProject.caseStudy.chapters[2];
  assert.match(final.intro,/TPU lattice/);
  assert.match(final.intro,/removable covers/);
  assert.match(final.intro,/66% mass reduction/);
  assert.match(final.intro,/concept-stage estimates awaiting validation/);
});

test('Running Blade preserves the original rolling crop sources, order, sizes and captions', () => {
  const expected = [
    ['Geometry', [
      ['figure-p4-0', 627, 506, 'Baseline blade geometry'],
      ['figure-p4-1', 586, 493, 'Iterated geometry · Perforations and local reinforcement'],
      ['figure-p4-2', 502, 459, 'Graded perforation sizing'],
      ['figure-p4-3', 545, 463, 'Perforation detail'],
      ['figure-p4-4', 557, 464, 'Distal perforation detail']
    ]],
    ['Structural results', [
      ['figure-p11-0', 1817, 558, 'Equivalent stress results from the coursework'],
      ['figure-p11-1', 842, 622, 'Fatigue result · Baseline aluminium'],
      ['figure-p11-2', 847, 623, 'Fatigue result · Iterated aluminium']
    ]]
  ].map(([label, figures]) => ({label, figures: figures.map(([file, width, height, caption]) => ({
    src: `./assets/projects/common-ground/study/${file}.webp`, width, height, caption, background: '#fff'
  }))}));
  const actual = feaProject.caseStudy.chapters
    .filter(chapter => chapter.figures?.filter(figure => !figure.wide).length > 1)
    .map(({label, figures}) => ({label, figures: figures.filter(figure => !figure.wide)}));
  assert.deepEqual(actual, expected);
});
