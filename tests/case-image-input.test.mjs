import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCaseImageStrip} from '../dist/case-image-strip.js';

class Element extends EventTarget {
  children = []; style = {}; attributes = {}; clientWidth = 390; offsetWidth = 1000; scrollLeft = 0;
  classList = {add() {}, remove() {}};
  capture = null;
  append(child) {this.children.push(child); child.parent = this;}
  insertBefore(child, sibling) {this.children.splice(this.children.indexOf(sibling), 0, child); child.parent = this;}
  get lastElementChild() {return this.children.at(-1);}
  remove() {this.parent.children.splice(this.parent.children.indexOf(this), 1);}
  setAttribute(name, value) {this.attributes[name] = value;}
  querySelectorAll() {return [];}
  cloneNode() {return new Element();}
  contains(child) {return child === this;}
  matches() {return false;}
  setPointerCapture(id) {this.capture = id;}
  hasPointerCapture(id) {return this.capture === id;}
  releasePointerCapture() {this.capture = null;}
  // The entrance has a scale transform. This is deliberately not layout width.
  getBoundingClientRect() {return {width: 982, left: 0};}
}

function withStrip(run, reducedMotion = true) {
  const names = ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'ResizeObserver', 'IntersectionObserver', 'performance'];
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let time = 0, nextId = 1;
  const frames = new Map(), timers = new Map(), intersections = [];
  const mocks = {
    requestAnimationFrame: callback => {const id = nextId++; frames.set(id, callback); return id;},
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => {const id = nextId++; timers.set(id, {callback, at: time + delay}); return id;},
    clearTimeout: id => timers.delete(id),
    performance: {now: () => time},
    ResizeObserver: class {observe() {} disconnect() {}},
    IntersectionObserver: class {constructor(callback) {intersections.push(callback);} observe() {} disconnect() {}},
  };
  for (const name of names) Object.defineProperty(globalThis, name, {value: mocks[name], configurable: true, writable: true});
  const viewport = new Element(), track = new Element(), cycle = new Element(), toggle = new Element();
  track.append(cycle);
  const stop = mountCaseImageStrip({viewport, track, cycle, toggle, label: 'Report', scroller: new Element(), reducedMotion});
  const event = (type, props = {}) => {
    const input = Object.assign(new Event(type, {cancelable: true}), props);
    viewport.dispatchEvent(input);
    return input;
  };
  const clock = {
    frame() {time += 16; const queue = [...frames.values()]; frames.clear(); queue.forEach(fn => fn(time));},
    advance(ms) {time += ms; for (const [id, timer] of [...timers]) if (timer.at <= time) {timers.delete(id); timer.callback();}},
  };
  try {intersections[0]([{isIntersecting: true}]); run({viewport, track, event, clock, frames, timers, stop});}
  finally {
    stop();
    for (const name of names) {
      if (descriptors.get(name)) Object.defineProperty(globalThis, name, descriptors.get(name));
      else delete globalThis[name];
    }
  }
}

test('drag event batches paint once per frame, at exact finger distance, using unscaled cycle width', () => withStrip(({viewport, track, event, clock, frames}) => {
  clock.frame();
  assert.equal(viewport.scrollLeft, 1000, 'Reveal scale must not shorten the loop');
  assert.ok(track.children.length >= 4, 'Native pan has a preceding and following buffer');
  event('pointerdown', {pointerType: 'mouse', isPrimary: true, button: 0, pointerId: 7, clientX: 500, clientY: 80});
  for (let x = 490; x >= 300; x -= 5) event('pointermove', {pointerId: 7, clientX: x, clientY: 80});
  assert.equal(viewport.scrollLeft, 1000, 'Input handlers do not repaint on every event');
  assert.equal(frames.size, 1);
  clock.frame();
  assert.equal(viewport.scrollLeft, 1200, 'No smoothing lag or dropped displacement');
  event('pointermove', {pointerId: 7, clientX: 420, clientY: 80});
  clock.frame();
  assert.equal(viewport.scrollLeft, 1080, 'Reversal follows immediately on the next frame');
  event('pointerup', {pointerId: 7});
}));

test('native touch hold, pointercancel and release inertia never fight auto drift or prevent touch input', () => withStrip(({viewport, event, clock, frames}) => {
  clock.frame();
  assert.equal(event('touchstart', {touches: [{}]}).defaultPrevented, false);
  assert.equal(event('pointerdown', {pointerType: 'touch', isPrimary: true, button: 0, pointerId: 8, clientX: 300, clientY: 80}).defaultPrevented, false);
  viewport.scrollLeft = 1175;
  event('scroll');
  event('pointercancel', {pointerId: 8});
  clock.advance(700);
  assert.equal(frames.size, 0, 'A stationary finger must not restart animation');
  assert.equal(viewport.scrollLeft, 1175);
  event('touchend', {touches: []});
  clock.advance(100);
  viewport.scrollLeft = 1240;
  event('scroll'); // Browser momentum is still moving after touchend.
  clock.advance(130);
  assert.equal(frames.size, 0, 'Native deceleration owns the scroll until quiet');
  clock.advance(11);
  clock.frame();
  assert.equal(viewport.scrollLeft, 1240, 'Resume retains the final page position');
}, false));

test('native loop rebases only after release; disposal cancels all pending resume work', () => withStrip(({viewport, event, clock, frames, timers, stop}) => {
  clock.frame();
  event('touchstart', {touches: [{}]});
  viewport.scrollLeft = 2170;
  event('scroll');
  clock.advance(400);
  assert.equal(viewport.scrollLeft, 2170);
  event('touchend', {touches: []});
  clock.advance(141);
  clock.frame();
  assert.equal(viewport.scrollLeft, 1170, 'The identical copy is rebased after momentum stops');
  event('touchstart', {touches: [{}]});
  event('touchend', {touches: []});
  assert.equal(timers.size, 1);
  stop();
  clock.advance(500);
  clock.frame();
  assert.equal(timers.size, 0);
  assert.equal(frames.size, 0);
}));

test('vertical reading and pinch wheels pass through the image strip', () => withStrip(({event, clock}) => {
  clock.frame();
  assert.equal(event('wheel', {deltaX: 1, deltaY: 70, deltaMode: 0}).defaultPrevented, false);
  assert.equal(event('wheel', {deltaX: 40, deltaY: 0, deltaMode: 0, ctrlKey: true}).defaultPrevented, false);
  assert.equal(event('wheel', {deltaX: 40, deltaY: 0, deltaMode: 0}).defaultPrevented, true);
}));
