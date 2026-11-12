import {InteractionScope} from './interaction-scope.js';

const IDLE_SPEED = 27; // px/s, leftward
const DRAG_SLOP = 7;
const DECAY = 4;
const MAX_SPEED = 660;
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function horizontalWheelDelta(event, width) {
  if (event.ctrlKey) return 0;
  const {deltaX: x, deltaY: y, shiftKey, deltaMode} = event;
  const amount = Math.abs(x) > Math.abs(y) * 1.15 ? x : shiftKey && x === 0 ? y : 0;
  return clamp(amount * (deltaMode === 1 ? 16 : deltaMode === 2 ? width : 1), 160);
}

export class ImageStripMotion {
  phase = 0;
  period = 0;
  impulse = 0;

  resize(period) {
    if (period <= 0 || period === this.period) return;
    this.phase = this.period ? this.phase * period / this.period : 0;
    this.period = period;
  }

  move(distance) {
    if (this.period) this.phase = ((this.phase + distance) % this.period + this.period) % this.period;
  }

  fling(speed) {
    this.impulse = Math.abs(speed) < 30 ? 0 : clamp(speed, MAX_SPEED) - IDLE_SPEED;
  }

  swipe(distance, momentum) {
    this.move(distance * .7);
    if (!momentum) return;
    const sign = Math.sign(distance);
    const carry = Math.max(0, sign * this.impulse) * .36;
    this.fling(sign * (IDLE_SPEED + Math.abs(distance) * 13 + carry));
  }

  step(dt) {
    const decay = Math.exp(-DECAY * dt);
    this.move(IDLE_SPEED * dt + this.impulse * (1 - decay) / DECAY);
    this.impulse *= decay;
    if (Math.abs(this.impulse) < .08) this.impulse = 0;
  }
}

// Touch uses the browser's native overflow scroller, including iOS momentum.
// Mouse/trackpad and idle drift share one animation-frame writer to scrollLeft.
export function mountCaseImageStrip({viewport, track, cycle, toggle, label, scroller, reducedMotion}) {
  const motion = new ImageStripMotion(), scope = new InteractionScope();
  let visible = false, paused = !!reducedMotion, keyboardFocus = false;
  let frame = 0, previousTime = 0, dirty = false, pointer = null, blockClickUntil = 0;
  let nativeActive = false, touching = false, resumeTimer = 0, paintedScroll = 0;
  let leftBuffer = null, measuredWidth = 0, disposed = false;
  const canPlay = () => visible && !paused && !keyboardFocus && !pointer && !nativeActive && motion.period > 0;

  function paint() {
    // The original, accessible cycle stays in the middle; the preceding copy
    // gives a touch gesture room to go in either direction without a seam.
    paintedScroll = motion.period + motion.phase;
    viewport.scrollLeft = paintedScroll;
  }
  function tick(time) {
    frame = 0;
    if (disposed) return;
    const playing = canPlay();
    if (playing && previousTime) motion.step(Math.min(.048, (time - previousTime) / 1000));
    if ((dirty || playing) && !nativeActive) paint();
    dirty = false;
    previousTime = playing ? time : 0;
    syncPlayback();
  }
  function syncPlayback() {
    if (disposed) return;
    if ((dirty && !nativeActive) || canPlay()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = previousTime = 0;
    }
  }
  function requestPaint() {dirty = true; syncPlayback();}
  function readNativePosition() {
    if (!motion.period) return;
    motion.phase = ((viewport.scrollLeft - motion.period) % motion.period + motion.period) % motion.period;
  }
  function clearResume() {clearTimeout(resumeTimer); resumeTimer = 0;}
  function pauseForNative() {
    clearResume();
    nativeActive = true;
    motion.impulse = 0;
    dirty = false;
    readNativePosition();
    syncPlayback();
  }
  function scheduleResume() {
    clearResume();
    if (touching || disposed) return;
    // Every inertial scroll event postpones this: JS never fights the finger,
    // a stationary hold, or Safari's own deceleration after pointercancel.
    resumeTimer = setTimeout(() => {
      resumeTimer = 0;
      if (touching || disposed) return;
      readNativePosition();
      nativeActive = false;
      requestPaint(); // Rebase to the identical middle copy only once settled.
    }, 140);
  }
  function duplicate() {
    const clone = cycle.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    for (const link of clone.querySelectorAll('a')) link.tabIndex = -1;
    return clone;
  }
  function measure() {
    // Layout width, NOT getBoundingClientRect(): the reveal animates scale.
    const period = cycle.offsetWidth, width = viewport.clientWidth;
    if (!period || !width || period === motion.period && width === measuredWidth) return;
    motion.resize(period);
    measuredWidth = width;
    if (!leftBuffer) {leftBuffer = duplicate(); track.insertBefore(leftBuffer, cycle);}
    const repeats = Math.ceil(width / period) + 3;
    while (track.children.length < repeats) track.append(duplicate());
    while (track.children.length > repeats) track.lastElementChild.remove();
    if (!nativeActive) requestPaint();
  }
  function updateButton() {
    const action = paused ? 'Play' : 'Pause';
    toggle.textContent = action;
    toggle.setAttribute('aria-label', `${action} ${label} image strip`);
  }
  scope.on(toggle, 'click', () => {
    paused = !paused;
    motion.impulse = 0;
    updateButton();
    syncPlayback();
  });
  scope.on(viewport, 'touchstart', event => {
    touching = event.touches.length > 0;
    pauseForNative();
  }, {passive: true});
  function endTouch(event) {
    touching = event.touches.length > 0;
    if (!touching) scheduleResume();
  }
  scope.on(viewport, 'touchend', endTouch, {passive: true});
  scope.on(viewport, 'touchcancel', endTouch, {passive: true});
  scope.on(viewport, 'scroll', () => {
    if (!motion.period || disposed) return;
    // Ignore our own animation-frame writes, not actual native movement.
    if (!nativeActive && Math.abs(viewport.scrollLeft - paintedScroll) < 1) return;
    if (!nativeActive) pauseForNative();
    readNativePosition();
    blockClickUntil = performance.now() + 240;
    scheduleResume();
  }, {passive: true});
  scope.on(viewport, 'wheel', event => {
    const distance = horizontalWheelDelta(event, viewport.clientWidth);
    if (!distance || !motion.period || touching) return;
    event.preventDefault();
    event.stopPropagation();
    if (nativeActive) {readNativePosition(); nativeActive = false; clearResume();}
    motion.swipe(distance, !paused && !keyboardFocus && !pointer);
    requestPaint();
  }, {passive: false});
  scope.on(viewport, 'pointerdown', event => {
    // Never capture/prevent touch pointers: native pan-x owns those gestures.
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 || pointer || !motion.period) return;
    clearResume();
    if (nativeActive) {readNativePosition(); nativeActive = false;}
    blockClickUntil = 0;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: performance.now(), speed: 0, axis: null};
    motion.impulse = 0;
    syncPlayback();
  });
  scope.on(viewport, 'pointermove', event => {
    if (event.pointerId !== pointer?.id) return;
    const {clientX: x, clientY: y} = event;
    if (!pointer.axis) {
      const dx = Math.abs(x - pointer.x), dy = Math.abs(y - pointer.y);
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      pointer.axis = dx > dy * 1.1 ? 'x' : 'y';
      if (pointer.axis === 'x') {
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add('is-dragging');
      }
    }
    if (pointer.axis !== 'x') return;
    const now = performance.now(), delta = pointer.lastX - x;
    const instantSpeed = clamp(delta * 1000 / Math.max(now - pointer.time, 12), MAX_SPEED);
    pointer.speed = now - pointer.time > 100 || Math.sign(pointer.speed) !== Math.sign(instantSpeed)
      ? instantSpeed : pointer.speed * .45 + instantSpeed * .55;
    pointer.lastX = x;
    pointer.time = now;
    motion.move(delta);
    requestPaint();
    if (event.cancelable) event.preventDefault();
  }, {passive: false});
  function endPointer(event) {
    if (event.pointerId !== pointer?.id) return;
    if (event.type === 'pointerleave' && viewport.hasPointerCapture(event.pointerId)) return;
    const now = performance.now(), ended = pointer;
    pointer = null;
    viewport.classList.remove('is-dragging');
    if (ended.axis) blockClickUntil = now + 240;
    if (ended.axis === 'x' && event.type === 'pointerup' && !paused && !keyboardFocus && now - ended.time < 100) motion.fling(ended.speed);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    syncPlayback();
  }
  for (const event of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) scope.on(viewport, event, endPointer);
  scope.on(viewport, 'dragstart', event => event.preventDefault());
  scope.on(viewport, 'click', event => {
    if (event.detail && performance.now() < blockClickUntil) {event.preventDefault(); event.stopPropagation();}
  }, {capture: true});
  scope.on(viewport, 'focusin', event => {
    keyboardFocus = event.target.matches(':focus-visible');
    if (keyboardFocus) {
      clearResume();
      if (nativeActive) {readNativePosition(); nativeActive = false;}
      motion.impulse = 0;
      if (event.target !== viewport && cycle.contains(event.target)) {
        const start = event.target.getBoundingClientRect().left - cycle.getBoundingClientRect().left;
        motion.move(Math.max(0, start) - motion.phase);
        requestPaint();
      }
    }
    syncPlayback();
  });
  scope.on(viewport, 'focusout', event => {
    if (viewport.contains(event.relatedTarget)) return;
    keyboardFocus = false;
    syncPlayback();
  });
  scope.on(viewport, 'keydown', event => {
    if (event.target !== viewport || event.altKey || event.ctrlKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    motion.move(viewport.clientWidth * (event.key === 'ArrowRight' ? .7 : -.7));
    requestPaint();
  });
  const resize = new ResizeObserver(measure);
  resize.observe(viewport);
  resize.observe(cycle);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) motion.impulse = 0;
    syncPlayback();
  }, {root: scroller});
  intersection.observe(viewport);
  updateButton();
  measure();
  return () => {
    disposed = true;
    scope.close();
    clearResume();
    resize.disconnect();
    intersection.disconnect();
    if (frame) cancelAnimationFrame(frame);
    viewport.classList.remove('is-dragging');
    if (pointer && viewport.hasPointerCapture(pointer.id)) viewport.releasePointerCapture(pointer.id);
    frame = 0;
  };
}
