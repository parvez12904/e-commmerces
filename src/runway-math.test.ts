import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRingPose,
  stepRingSpring,
  computeClassicPose,
  stepClassicBodySpring,
  shortestDelta,
  computePhoneSwipeTarget,
  computeDesktopMomentumTarget,
  type ClassicBodyState,
} from './runway-math';
import {
  NATIVE_CATALOG,
  validateCatalog,
  sanitizeBagEntries,
  addItemsToBagEntries,
  formatMoney,
  formatShortlistText,
} from './catalog';

test('ring mode desktop slot geometry matches specification table', () => {
  const W = 1000;
  const H = 800;
  const fs = 1.08;

  // Slot 0 while moving
  const slot0Moving = computeRingPose(0, 0, W, H, fs, false, false, true);
  assert.ok(Math.abs(slot0Moving.scale - 1.08) < 0.001);
  assert.ok(Math.abs(slot0Moving.x - 500) < 0.1);
  assert.equal(slot0Moving.blur, 0);
  assert.equal(slot0Moving.opacity, 1);
  assert.equal(slot0Moving.z, 1080);

  // Slot 0 at rest hides body so hero takes over
  const slot0Still = computeRingPose(0, 0, W, H, fs, false, true, true);
  assert.equal(slot0Still.opacity, 0);

  // Slot +1
  const slot1 = computeRingPose(1, 0, W, H, fs, false, true, true);
  assert.ok(Math.abs(slot1.scale - 0.952) < 0.002);
  assert.ok(Math.abs(slot1.x - 795) < 1.5);
  assert.ok(Math.abs(slot1.blur - 1.8) < 0.01);
  assert.equal(slot1.opacity, 1);
  assert.equal(slot1.z, 952);

  // Slot -1 mirrors x around 0.5W
  const slotNeg1 = computeRingPose(11, 0, W, H, fs, false, true, true);
  assert.ok(Math.abs(slotNeg1.x - (W - slot1.x)) < 0.01);
  assert.equal(slotNeg1.z, 952);

  // Slot +2
  const slot2 = computeRingPose(2, 0, W, H, fs, false, true, true);
  assert.ok(Math.abs(slot2.scale - 0.842) < 0.002);
  assert.ok(Math.abs(slot2.x - 952) < 1.5);
  assert.ok(Math.abs(slot2.blur - 3.8) < 0.01);
  assert.equal(slot2.z, 842);

  // Slot +4
  const slot4 = computeRingPose(4, 0, W, H, fs, false, true, true);
  assert.ok(Math.abs(slot4.scale - 0.64) < 0.002);
  assert.ok(Math.abs(slot4.blur - 6.5) < 0.01);
  assert.ok(Math.abs(slot4.opacity - 0.167) < 0.01);
});

test('classic mode phone slots match specification', () => {
  const W = 390;
  const b0: ClassicBodyState = { a: 0, w: 180, x: 0, g: 0, v: 0, from: 0, trip: false };
  const p0Moving = computeClassicPose(b0, 0, W, true, false, true);
  assert.ok(Math.abs(p0Moving.x - 0.3 * W) < 0.01);
  assert.equal(p0Moving.bottom, 22);
  assert.equal(p0Moving.scale, 1);
  assert.equal(p0Moving.opacity, 1);

  const p0Still = computeClassicPose(b0, 0, W, true, true, true);
  assert.equal(p0Still.opacity, 0);

  const b1: ClassicBodyState = { a: 1, w: 180, x: 1, g: 1, v: 0, from: 1, trip: false };
  const p1 = computeClassicPose(b1, 0, W, true, true, true);
  assert.ok(Math.abs(p1.x - 0.62 * W) < 0.01);
  assert.equal(p1.bottom, 44);
  assert.ok(Math.abs(p1.scale - 0.76) < 0.001);
  assert.ok(Math.abs(p1.opacity - 0.87) < 0.001);
  assert.ok(Math.abs(p1.blur - 0.9) < 0.001);
});

test('spring simulation converges to target without overshoot', () => {
  let cur = -1.15;
  let vel = 0;
  const target = 0;
  let settled = false;
  for (let i = 0; i < 120; i++) {
    const res = stepRingSpring(cur, vel, target, 1 / 60);
    cur = res.cur;
    vel = res.vel;
    assert.ok(cur <= 0.001, 'critically damped spring should not overshoot');
    if (res.settled) {
      settled = true;
      break;
    }
  }
  assert.equal(settled, true);
  assert.equal(cur, 0);
});

test('classic body spring converges and clears trip state', () => {
  const b: ClassicBodyState = { a: 0, w: 180, x: 0, g: 0, v: 0, from: 0, trip: false };
  let settled = false;
  for (let i = 0; i < 180; i++) {
    settled = stepClassicBodySpring(b, 1, 12, 1 / 60, false);
    if (settled) break;
  }
  assert.equal(settled, true);
  assert.equal(b.x, 11);
  assert.equal(b.trip, false);
});

test('navigation shortestDelta and swipe/momentum helpers', () => {
  assert.equal(shortestDelta(0, 5, 6), -1);
  assert.equal(shortestDelta(5, 0, 6), 1);
  assert.equal(shortestDelta(1, 4, 6), 3);
  assert.equal(computePhoneSwipeTarget(2, -45, -0.5), 3);
  assert.equal(computePhoneSwipeTarget(2, 45, 0.5), 1);
  assert.equal(computePhoneSwipeTarget(2, 10, 0.1), 2);
  assert.equal(computeDesktopMomentumTarget(2.1, 2, -0.5, 200), 3);
});

test('catalog validation and styling bag operations', () => {
  const catalog = validateCatalog(NATIVE_CATALOG);
  assert.equal(catalog.looks.length, 6);
  assert.equal(catalog.items.length, 8);

  const sanitized = sanitizeBagEntries([
    { id: 57015167025457, quantity: 2 },
    { id: 'bad', quantity: 1 },
    { id: 123, quantity: 99 },
  ]);
  assert.equal(sanitized.length, 1);

  const updated = addItemsToBagEntries(
    [],
    [
      { id: 57015167025457, quantity: 1 },
      { id: 56835911582001, quantity: 1 },
    ],
    catalog
  );
  assert.equal(updated.length, 2);
  assert.equal(formatMoney(149), '$149.00');

  const shortlist = formatShortlistText(updated, catalog);
  assert.ok(shortlist.includes('RUNWAY — STYLING SHORTLIST'));
  assert.ok(shortlist.includes('Air Jordan 12 Retro · Size 40 · Quantity 1'));
  assert.ok(shortlist.includes('https://nike-makknzjs.myshopify.com/products/tatum-5-orbit-copy'));
});
