export interface Pose {
  x: number;
  bottom: number;
  scale: number;
  opacity: number;
  blur: number;
  z: number;
}

export interface ClassicBodyState {
  a: number;
  w: number;
  x: number;
  g: number;
  v: number;
  from: number;
  trip: boolean;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function wrapN(v: number, n: number): number {
  return ((v % n) + n) % n;
}

export function wrapSignedAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  let a = ((rad % twoPi) + twoPi) % twoPi;
  if (a > Math.PI) a -= twoPi;
  return a;
}

export function shortestDelta(fromIndex: number, toIndex: number, n: number): number {
  let d = wrapN(toIndex - fromIndex, n);
  if (d > n / 2) d -= n;
  return d;
}

export function computeRingRank(a: number, target: number, N: number): number {
  let d = wrapN(a - Math.round(target), N);
  if (d > N / 2) d -= N;
  return d;
}

export function computeRingPose(
  a: number,
  cur: number,
  W: number,
  H: number,
  fs: number,
  isMobile: boolean,
  still: boolean,
  blurEnabled: boolean,
  N = 12
): Pose {
  const cx = 0.5 * W;
  const R = (isMobile ? 0.72 : 0.62) * W;
  const P = (isMobile ? 1.9 : 1.65) * W;
  const floor = H - 34;
  const horizon = 0.36 * H;
  const step = (Math.PI * 2) / N;

  const phi = wrapSignedAngle((a - cur) * step);
  const zDepth = R * (1 - Math.cos(phi));
  const persp = P / (P + zDepth);
  const sl = Math.abs(phi) / step;
  const scale = persp * (1 + (fs - 1) * clamp(1 - sl, 0, 1));
  const x = cx + R * Math.sin(phi) * persp;
  const feet = horizon + (floor - horizon) * persp;
  const bottom = H - feet;
  const blur = blurEnabled
    ? sl <= 1
      ? 1.8 * sl
      : Math.min(1.8 + (sl - 1) * 2, 6.5)
    : 0;
  let opacity = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
  if (still && sl < 0.02) {
    opacity = 0;
  }
  const z = Math.round(scale * 1000);

  return { x, bottom, scale, opacity, blur, z };
}

export function stepRingSpring(
  cur: number,
  vel: number,
  target: number,
  dt: number,
  K = 95
): { cur: number; vel: number; settled: boolean } {
  const C = 2 * Math.sqrt(K);
  const clampedDt = Math.min(0.034, dt);
  const h = clampedDt / 3;
  let c = cur;
  let v = vel;
  for (let s = 0; s < 3; s++) {
    const acc = -K * (c - target) - C * v;
    v += acc * h;
    c += v * h;
  }
  if (Math.abs(c - target) <= 0.0005 && Math.abs(v) <= 0.0005) {
    return { cur: target, vel: 0, settled: true };
  }
  return { cur: c, vel: v, settled: false };
}

export function stepClassicBodySpring(
  b: ClassicBodyState,
  target: number,
  N: number,
  dt: number,
  dragging: boolean,
  lag = 0.04,
  K = 95
): boolean {
  const C = 2 * Math.sqrt(K);
  const clampedDt = Math.min(0.034, dt);
  const goal = wrapN(b.a - target, N);
  const prevGoal = wrapN(b.g, N);
  if (Math.abs(goal - b.x) > N / 2 && !b.trip) {
    b.trip = true;
    b.from = b.x;
  } else if (Math.abs(goal - prevGoal) > N / 2 && !b.trip) {
    b.trip = true;
    b.from = b.x;
  }

  const tau = dragging ? 0.016 : b.trip ? 0.1 : 0.03 + lag * Math.min(goal, 4);
  b.g += (goal - b.g) * (1 - Math.exp(-clampedDt / tau));

  const h = clampedDt / 3;
  for (let s = 0; s < 3; s++) {
    const acc = -K * (b.x - b.g) - C * b.v;
    b.v += acc * h;
    b.x += b.v * h;
  }

  if (b.trip && Math.abs(b.x - goal) < 0.02) {
    b.trip = false;
  }

  if (
    Math.abs(b.x - goal) <= 0.0006 &&
    Math.abs(b.g - goal) <= 0.0006 &&
    Math.abs(b.v) <= 0.0006
  ) {
    b.x = goal;
    b.g = goal;
    b.v = 0;
    b.trip = false;
    return true;
  }
  return false;
}

export function computeClassicPose(
  b: ClassicBodyState,
  target: number,
  W: number,
  isMobile: boolean,
  still: boolean,
  blurEnabled: boolean,
  N = 12
): Pose {
  const ax = isMobile ? 0.3 : 0.4;
  const ay = isMobile ? 22 : 36;
  const sx = isMobile ? 0.32 : 0.125;
  const sy = isMobile ? 22 : 58;
  const sr = 0.76;
  const ex = isMobile ? 0.55 : 0.38;
  const d = isMobile ? 4 : 5;

  const goal = wrapN(b.a - target, N);
  let k = b.x;
  let e = -1;

  if (b.trip) {
    const span = Math.abs(goal - b.from) || 1;
    const u = clamp(Math.abs(b.x - b.from) / span, 0, 1);
    if (goal > b.from) {
      if (u < 0.5) {
        e = 2 * u * 1.4;
      } else {
        k = goal + 2 * (1 - u);
      }
    } else {
      if (u < 0.5) {
        k = b.from + 2 * u;
      } else {
        e = 2 * (1 - u) * 1.4;
      }
    }
  } else if (k < 0) {
    e = Math.min(-k, 1.4);
  }

  if (e >= 0) {
    const x = W * (ax - ex * e);
    const bottom = ay - 22 * e;
    const scale = 1 + 0.14 * e;
    const opacity = Math.max(0, 1 - 1.05 * e);
    const blur = blurEnabled ? 4 * Math.min(e, 1) : 0;
    const z = 1100;
    return { x, bottom, scale, opacity, blur, z };
  }

  const x = W * (ax + sx * k);
  const bottom = ay + sy * k;
  const scale = Math.pow(sr, k);
  let opacity = k <= d - 1 ? 1 - 0.13 * k : Math.max(0, (1 - 0.13 * (d - 1)) * (d - k));
  if (still && Math.abs(k) < 0.02) {
    opacity = 0;
  }
  const blur = blurEnabled ? Math.min(0.9 * k, 3.2) : 0;
  const z = 1000 - Math.round(10 * k);

  return { x, bottom, scale, opacity, blur, z };
}

export function computePhoneSwipeTarget(
  from: number,
  dx: number,
  vx: number,
  sign = -1
): number {
  if (Math.abs(dx) > 30 || Math.abs(vx) > 0.3) {
    return from + sign * (dx > 0 ? 1 : -1);
  }
  return from;
}

export function computeDesktopMomentumTarget(
  target: number,
  from: number,
  vx: number,
  unit: number,
  sign = -1
): number {
  let i = Math.round(target + (sign * vx * 160) / unit);
  if (i === from && Math.abs(vx) > 0.3) {
    i = from + sign * (vx > 0 ? 1 : -1);
  }
  return clamp(i, from - 2, from + 2);
}
