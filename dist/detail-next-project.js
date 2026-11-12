import * as THREE from './vendor/three.module.js';
import {InteractionScope} from './interaction-scope.js';
import {createDiscMarker} from './disc-marker.js';
import {copyDiscRenderTree} from './disc-render-copy.js';
import {nextDiscPose, nextProjectHandoff, NextDiscDynamics, NextProjectGesture} from './detail-next-motion.js';
import {addNightLamp,bindRoomTheme} from './night-room.js';

const rim = Array.from({length: 64}, (_, index) => {
  const angle = index * Math.PI / 32;
  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
});
const clipPoint = new THREE.Vector3();

export function placeNextDisc(anchor, camera, pose, width, height, worldPerPixel) {
  anchor.scale.setScalar(pose.radius * worldPerPixel);
  let centreY = pose.y;
  const targetTop = height - pose.rise;
  for (let pass = 0; pass < 4; pass++) {
    anchor.position.set((pose.x - width / 2) * worldPerPixel, (height / 2 - centreY) * worldPerPixel, 0);
    anchor.updateWorldMatrix(true, false);
    let top = Infinity;
    for (const point of rim) {
      clipPoint.copy(point).applyMatrix4(anchor.matrixWorld).project(camera);
      top = Math.min(top, (1 - clipPoint.y) * height / 2);
    }
    const error = top - targetTop;
    if (Math.abs(error) < .03) break;
    centreY -= error;
  }
  anchor.position.y = (height / 2 - centreY) * worldPerPixel;
  anchor.updateWorldMatrix(true, true);
}

export function createDetailNextProject({section, stage, host, button, scroller,
  renderer, canvas, markerCanvas, environment, copyProject, gsap, reduced = false, onAdvance = () => {}}) {
  const canvasHome = canvas.parentNode, markerHome = markerCanvas.parentNode;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  camera.position.z = 4.6;
  scene.environment = environment;
  addNightLamp(scene, {position: [3, 3, 5], target: [.4, -1.25, 0], intensity: 132});
  const fill = new THREE.DirectionalLight('#eee8dd', .35);
  fill.position.set(-3, 1, 4);
  scene.add(fill);
  const disposeTheme=bindRoomTheme(scene,renderer);
  const anchor = new THREE.Group();
  scene.add(anchor);

  const marker = createDiscMarker();
  const motion = new NextDiscDynamics();
  const navigation = new NextProjectGesture();
  const context = markerCanvas.getContext('2d'), point = new THREE.Vector3();
  let active = false, mounted = false, scope = null, observer = null;
  let projectId = null, disc = null, gesture = null, touch = null;
  let width = 1, height = 1, worldPerPixel = 1, titleShift = '';
  let advanceAt = null, departureAt = null, delivered = false;

  function measure() {
    if (!mounted) return;
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const dpr = renderer.getPixelRatio();
    markerCanvas.width = Math.round(width * dpr);
    markerCanvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    worldPerPixel = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / height;
  }

  function projectPoint(angle, radius) {
    point.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    point.applyMatrix4(anchor.matrixWorld).project(camera);
    return [(point.x + 1) * width / 2, (1 - point.y) * height / 2];
  }

  function tick(_time, dtMs) {
    if (!mounted || !disc || !width || !height) return;
    const now = performance.now();
    if (!reduced) motion.update((dtMs || 16.67) / 1000, now);
    const {holdMs, exitMs} = nextProjectHandoff;
    if (advanceAt !== null && departureAt === null && now - advanceAt >= holdMs && motion.gauge >= .98) {
      departureAt = now;
      stage.classList.add('is-leaving');
    }
    const departure = departureAt === null ? 0 : Math.min(1, (now - departureAt) / exitMs);
    const pose = nextDiscPose(width, height, motion.gauge, departure);
    const shift = `${(pose.lift * width * .042).toFixed(2)}px`;
    if (shift !== titleShift) {
      titleShift = shift;
      stage.style.setProperty('--next-title-shift', shift);
    }
    anchor.rotation.set(pose.tiltX, pose.tiltY, pose.tiltZ);
    placeNextDisc(anchor, camera, pose, width, height, worldPerPixel);
    disc.rotation.z = motion.angle;
    renderer.render(scene, camera);
    context.clearRect(0, 0, width, height);
    if (motion.gauge > 0) {
      marker.drawGauge(context, {progress: motion.gauge, projectPoint, lineWidth: Math.min(9, Math.max(2.6, width * .0055)) * (1 - .6 * departure)});
    }
    Object.assign(section.dataset, {
      angle: motion.angle.toFixed(4),
      angularVelocity: (reduced ? 0 : motion.velocity).toFixed(4),
      gaugeProgress: motion.gauge.toFixed(4),
      screenExposure: (pose.rise / height).toFixed(4),
      tiltY: pose.tiltY.toFixed(4),
      departure: departure.toFixed(4),
      rendererActive: 'true'
    });
    if (departure === 1 && !delivered) {
      delivered = true;
      onAdvance(projectId);
    }
  }

  function mount() {
    if (mounted || !disc) return;
    mounted = true;
    host.append(canvas, markerCanvas);
    stage.classList.add('is-live');
    measure();
    tick(0, 0);
    gsap.ticker.add(tick);
  }

  function cancelAdvance() {
    advanceAt = departureAt = null;
    delivered = false;
    stage.classList.remove('is-leaving');
    motion.committed = false;
    motion.release();
    navigation.reset();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    gsap.ticker.remove(tick);
    context.clearRect(0, 0, width, height);
    renderer.clear();
    canvasHome.append(canvas);
    markerHome.append(markerCanvas);
    stage.classList.remove('is-live');
    motion.clearInput();
    section.dataset.rendererActive = 'false';
  }

  function sync() {
    if (!active) return;
    const rect = section.getBoundingClientRect(), screen = scroller.getBoundingClientRect();
    if (rect.top < screen.bottom && rect.bottom > screen.top && rect.width > 0) mount();
    else unmount();
  }

  const atBottom = () => mounted && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 2;

  function input(delta, event, source) {
    if (reduced || Math.abs(delta) < .1) return;
    if (delta < 0) {
      cancelAdvance();
      return;
    }
    if (advanceAt !== null) return;
    const now = performance.now();
    const eventTime = Math.abs(event.timeStamp - now) < 1500 ? event.timeStamp : now;
    const result = navigation.feed(delta, eventTime, {eligible: atBottom(), height: scroller.clientHeight, source});
    if (result.distance === 0) {
      motion.release();
      return;
    }
    motion.impulse(result.speed, now, result.charge);
    if (result.triggered) {
      advanceAt = now;
      motion.completeGauge();
    }
  }

  function onWheel(event) {
    if (event.ctrlKey) {
      cancelAdvance();
      return;
    }
    if (Math.abs(event.deltaX || 0) > Math.abs(event.deltaY) * 1.1) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1;
    const delta=event.deltaY*unit;
    if(delta>0&&atBottom()&&event.cancelable)event.preventDefault();
    input(delta, event, 'wheel');
  }

  function onScroll() {
    sync();
    if (gesture?.type === 'touch') gesture.cancelled = true;
    if (atBottom()) return;
    if (advanceAt !== null) cancelAdvance();
    else motion.release();
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1) {
      touch = null;
      cancelAdvance();
      return;
    }
    const finger = event.touches[0];
    touch = {x: finger.clientX, y: finger.clientY};
    if (advanceAt === null) navigation.begin(atBottom());
  }

  function onTouchMove(event) {
    if (!touch) return;
    if (event.touches.length !== 1) {
      touch = null;
      cancelAdvance();
      return;
    }
    const finger = event.touches[0], delta = touch.y - finger.clientY;
    const horizontal = Math.abs(touch.x - finger.clientX) > Math.abs(delta) * 1.1;
    touch = {x: finger.clientX, y: finger.clientY};
    if (!horizontal) {
      if(delta>0&&atBottom()&&event.cancelable)event.preventDefault();
      input(delta,event,'touch');
    }
  }

  function onTouchEnd(event) {
    touch = null;
    if (event.type === 'touchcancel') cancelAdvance();
    else motion.release();
  }

  function deactivate() {
    if (!active) return;
    cancelAdvance();
    active = false;
    scope.close();
    scope = null;
    observer.disconnect();
    observer = null;
    unmount();
    gesture = touch = null;
    section.dataset.listeners = '0';
  }

  function activate() {
    if (active) return;
    active = true;
    scope = new InteractionScope();
    scope.on(scroller, 'scroll', onScroll, {passive: true});
    scope.on(scroller, 'wheel', onWheel, {passive: false});
    scope.on(scroller, 'touchstart', onTouchStart, {passive: true});
    scope.on(scroller, 'touchmove', onTouchMove, {passive: false});
    scope.on(scroller, 'touchend', onTouchEnd, {passive: true});
    scope.on(scroller, 'touchcancel', onTouchEnd, {passive: true});
    scope.on(button, 'pointerdown', event => {
      gesture = {x: event.clientX, y: event.clientY, type: event.pointerType, cancelled: false};
    }, {passive: true});
    scope.on(button, 'pointermove', event => {
      if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) gesture.cancelled = true;
    }, {passive: true});
    scope.on(button, 'pointercancel', () => { if (gesture) gesture.cancelled = true; }, {passive: true});
    observer = new ResizeObserver(() => { measure(); sync(); });
    observer.observe(stage);
    section.dataset.listeners = String(scope.count);
    sync();
  }

  function setProject(id) {
    if (id === projectId) return;
    cancelAdvance();
    motion.clearInput();
    motion.angle = -.28;
    if (disc) anchor.remove(disc);
    projectId = id;
    disc = copyProject(id);
    if (disc) {
      disc.position.set(0, 0, 0);
      disc.quaternion.identity();
      disc.scale.setScalar(1);
      anchor.add(disc);
    }
    section.dataset.projectId = id;
  }

  function transitionSource(id) {
    if (id !== projectId || !mounted || !disc) return null;
    anchor.updateWorldMatrix(true, true);
    const snapshot = copyDiscRenderTree(anchor), rect = stage.getBoundingClientRect();
    snapshot.position.x += (rect.left + width / 2 - innerWidth / 2) * worldPerPixel;
    snapshot.position.y -= rect.top * worldPerPixel;
    snapshot.updateWorldMatrix(true, true);
    return {perno: snapshot, esterno: snapshot};
  }

  return {
    activate, deactivate, setProject, transitionSource,
    canOpen: event => advanceAt === null && (event.detail === 0 || !gesture?.cancelled),
    destroy() {
      disposeTheme();
      deactivate();
      scene.remove(anchor);
      anchor.clear();
    },
    get diagnostics() {
      return {active, mounted, projectId, velocity: motion.velocity, gauge: motion.gauge, queued: advanceAt !== null, leaving: departureAt !== null, listeners: scope?.count || 0};
    }
  };
}
