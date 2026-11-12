import {discConfig} from './disc-config.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const wheelGapMs = 155;

export const nextProjectHandoff = {holdMs: 210, exitMs: 480};

// Fit the visible cap in screen space. The disc stays beneath the fold even
// at full charge, as in the reference's 25–34% viewport exposure.
export function nextDiscPose(width, height, charge, departure = 0) {
  const mobile = width <= 700;
  const pressure = clamp(charge);
  const lift = pressure * (.8 + .2 * pressure);
  const sink = clamp(departure) ** 2;
  const radius = Math.min(width * (mobile ? .60 : .283 + .011 * lift), height * .56) * (1 - .82 * sink);
  const raisedHeight = height * ((mobile ? .17 : .246) + lift * (mobile ? .105 : .096));
  const rise = raisedHeight - (raisedHeight + height * .075) * sink;
  return {
    radius, rise, lift,
    x: width / 2, y: height + radius - rise,
    tiltX: discConfig.restRotation.x * (1 - .19 * pressure),
    tiltY: discConfig.restRotation.y * (1 - .23 * pressure),
    tiltZ: discConfig.restRotation.z
  };
}

// Rotation keeps its own inertia. One eased value drives the lift, tilt, type
// spread and the length of the ink stroke, including the return to rest.
export class NextDiscDynamics {
  constructor() {
    this.angle = -.28;
    this.clearInput();
  }

  clearInput() {
    this.velocity = discConfig.idleSpinRate;
    this.boost = 0;
    this.gauge = 0;
    this.target = 0;
    this.lastInput = -Infinity;
    this.committed = false;
  }

  impulse(speed, time, charge) {
    this.boost = Math.min(2.85, speed * .78);
    this.target = charge;
    this.lastInput = time;
  }

  release() {
    this.lastInput = -Infinity;
  }

  completeGauge() {
    this.committed = true;
    this.target = 1;
  }

  update(seconds, time) {
    const dt = clamp(seconds, 0, .064);
    const pushing = this.committed || time - this.lastInput < wheelGapMs + 10;
    const target = pushing ? this.target : 0;
    this.gauge += (target - this.gauge) * (1 - Math.exp(-(pushing ? 9.5 : 5) * dt));
    if (!pushing && this.gauge < .003) this.gauge = 0;
    this.boost *= Math.exp(-(pushing ? 1.4 : 3.8) * dt);
    if (this.boost < .002) this.boost = 0;
    const idle = discConfig.idleSpinRate;
    const speed = idle + this.boost;
    const targetSpeed = pushing ? speed : Math.min(speed, this.velocity);
    this.velocity += (targetSpeed - this.velocity) * (1 - Math.exp(-(pushing ? 12 : 8) * dt));
    if (!pushing && this.velocity - idle < .003) this.velocity = idle;
    this.angle -= this.velocity * dt;
  }
}

const noPressure = {charge: 0, distance: 0, speed: 0, triggered: false};

// Native wheel events have no release signal. Group them into bursts and
// exclude the decaying tail from the distance budget.
export class NextProjectGesture {
  constructor() {
    this.reset();
  }

  reset() {
    this.source = null;
    this.touchEligible = null;
    this.start = this.lastTime = -Infinity;
    this.allowed = this.tail = this.fired = false;
    this.total = this.peak = this.previous = this.falling = 0;
  }

  begin(eligible) {
    this.reset();
    this.touchEligible = eligible;
  }

  feed(distance, time, {eligible, height, source}) {
    if (this.fired || !Number.isFinite(distance) || !Number.isFinite(time) || distance < .1) return noPressure;

    const wheel = source === 'wheel';
    const renewed = wheel && this.tail && time - this.start > 100 &&
      distance >= Math.max(9, this.previous * 2.1, this.peak * .34);
    if (source !== this.source || (wheel && time - this.lastTime > wheelGapMs) || renewed) {
      const allowed = source === 'touch' ? this.touchEligible ?? eligible : eligible;
      this.reset();
      this.source = source;
      this.allowed = allowed;
      this.start = time;
    }

    const interval = Number.isFinite(this.lastTime) ? Math.max(8, time - this.lastTime) : 48;
    this.lastTime = time;
    if (wheel && distance <= this.previous && distance < this.peak * .53 && time - this.start > 42) {
      this.falling++;
      if (this.falling >= 2) this.tail = true;
    } else {
      this.falling = 0;
    }
    this.previous = distance;
    this.peak = Math.max(this.peak, distance);
    if (!this.allowed || !eligible || this.tail) return noPressure;

    this.total += distance;
    const travel = clamp(height * .70, 345, 680);
    const charge = clamp(this.total / travel);
    this.fired = charge === 1;
    return {charge, distance, speed: distance / interval, triggered: this.fired};
  }
}
