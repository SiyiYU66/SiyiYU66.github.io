import test from 'node:test';
import assert from 'node:assert/strict';
import {ImageStripMotion, horizontalWheelDelta} from '../dist/case-image-strip.js';

test('horizontal trackpad motion is signed; vertical/diagonal reading and pinch zoom pass through', () => {
  const wheel = (deltaX, deltaY, extra) => horizontalWheelDelta({deltaX, deltaY, deltaMode: 0, ...extra}, 390);
  assert.equal(wheel(54, 4), 54);
  assert.equal(wheel(-54, 4), -54);
  assert.equal(wheel(2, 54), 0);
  assert.equal(wheel(43, 42), 0);
  assert.equal(wheel(52, 0, {ctrlKey: true}), 0);
  assert.equal(wheel(0, -3, {shiftKey: true, deltaMode: 1}), -48);
});

test('the strip wraps in both directions and retains its position within the cycle on resize', () => {
  const strip = new ImageStripMotion();
  strip.resize(1000);
  strip.move(-85);
  assert.equal(strip.phase, 915);
  strip.move(90);
  assert.equal(strip.phase, 5);
  strip.resize(1400);
  assert.equal(strip.phase, 7);
});

test('wheel reversal immediately switches direction and release settles to the same leftward drift', () => {
  const strip = new ImageStripMotion();
  strip.resize(1200);
  strip.move(600);
  strip.step(.1);
  const idle = strip.phase - 600;
  strip.swipe(30, true);
  let phase = strip.phase;
  strip.step(.1);
  assert.ok(strip.phase - phase > 8 * idle);
  strip.swipe(-30, true);
  phase = strip.phase;
  strip.step(.1);
  assert.ok(strip.phase - phase < -8 * idle);
  for (let n = 0; n < 80; n++) strip.step(.05);
  phase = strip.phase;
  strip.step(.1);
  assert.ok(Math.abs(strip.phase - phase - idle) < 1e-5);
});

test('manual motion stays available while paused without leaving momentum behind', () => {
  const strip = new ImageStripMotion();
  strip.resize(1000);
  strip.move(100);
  strip.swipe(-50, false);
  assert.ok(strip.phase < 100);
  assert.equal(strip.impulse, 0);
});
