// TST-UNIT-001 through TST-UNIT-010 — Computation Module unit tests.
//
// Realizes: REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-027,
//           REQ-053, REQ-080.
// Risk controls: RCM-01 (RISK-01).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMmol,
  safeToMmol,
  glucoseState,
  bubbleClass,
  computeTrend,
  timeAgoStr,
  computeTIRFromReadings,
  latestNonNull,
  resampleToBins,
  smoothBins,
  smoothPath,
} from '../../lib/computation.mjs';

const APPROX = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('TST-UNIT-001: toMmol divisor 18.0182 (REQ-080)', () => {
  it('zero in, zero out', () => {
    assert.equal(toMmol(0), 0);
  });
  it('exactly 18.0182 mg/dL → exactly 1.0 mmol/L', () => {
    assert.ok(APPROX(toMmol(18.0182), 1.0));
  });
  it('100 mg/dL → 5.5494... mmol/L', () => {
    assert.ok(APPROX(toMmol(100), 100 / 18.0182));
  });
  it('inverse round-trip preserves value within precision', () => {
    for (const mg of [40, 70, 100, 140, 200, 300, 400]) {
      const mmol = toMmol(mg);
      const back = mmol * 18.0182;
      assert.ok(Math.abs(back - mg) < 1e-9, `round-trip for ${mg} drifted to ${back}`);
    }
  });
});

describe('TST-UNIT-002: glucoseState boundaries (REQ-024)', () => {
  it('classifies critical-low below 3.0', () => {
    assert.equal(glucoseState(2.5).cls, 'critical-low');
    assert.equal(glucoseState(2.99).cls, 'critical-low');
  });
  it('classifies low for 3.0..3.89', () => {
    assert.equal(glucoseState(3.0).cls, 'low');
    assert.equal(glucoseState(3.5).cls, 'low');
    assert.equal(glucoseState(3.89).cls, 'low');
  });
  it('classifies normal at boundary 3.9 and 10.0', () => {
    assert.equal(glucoseState(3.9).cls, '');
    assert.equal(glucoseState(10.0).cls, '');
  });
  it('classifies high for 10.01..13.9', () => {
    assert.equal(glucoseState(10.01).cls, 'high');
    assert.equal(glucoseState(13.9).cls, 'high');
  });
  it('classifies critical-high above 13.9', () => {
    assert.equal(glucoseState(14.0).cls, 'critical-high');
    assert.equal(glucoseState(20.0).cls, 'critical-high');
  });
});

describe('TST-UNIT-003: computeTrend direction and magnitude (REQ-022)', () => {
  const t0 = new Date('2026-04-28T12:00:00Z').getTime();
  const mkReading = (offsetMin, glucose) => ({
    timestamp: new Date(t0 + offsetMin * 60000).toISOString(),
    glucose,
  });

  it('returns Steady on empty or single-point input', () => {
    assert.equal(computeTrend([]).text, 'Steady');
    assert.equal(computeTrend([mkReading(0, 100)]).text, 'Steady');
  });

  it('detects rising at high rate', () => {
    // 100 mg/dL → 200 mg/dL in 10 min = 0.5 mmol/L per minute
    const r = computeTrend([mkReading(0, 100), mkReading(10, 200)]);
    assert.equal(r.arrow, '↑');
    assert.equal(r.text, 'Rising fast');
  });

  it('detects falling at low rate', () => {
    // 200 → 180 in 30 min = ~0.04 mmol/L/min — below threshold; expect Steady
    const r = computeTrend([mkReading(0, 200), mkReading(30, 180)]);
    assert.equal(r.text, 'Steady');
  });

  it('returns Steady for zero or negative time delta', () => {
    const r = computeTrend([mkReading(10, 200), mkReading(10, 100)]);
    assert.equal(r.text, 'Steady');
  });
});

describe('TST-UNIT-004: computeTIRFromReadings percentages (REQ-024)', () => {
  it('returns null for empty input', () => {
    assert.equal(computeTIRFromReadings([]), null);
  });

  it('100% in target when all readings normal', () => {
    const readings = [
      { glucose: 100 }, { glucose: 120 }, { glucose: 80 },
    ];
    const r = computeTIRFromReadings(readings);
    assert.equal(r.timeInRange, 100);
    assert.equal(r.timeAboveRange, 0);
    assert.equal(r.timeBelowRange, 0);
  });

  it('balanced distribution returns expected percentages', () => {
    // Build 10 readings: 1 vl, 1 l, 6 t, 1 h, 1 vh
    const readings = [
      { glucose: 40 },        // 2.22 mmol/L → critical-low
      { glucose: 65 },        // 3.61 → low
      { glucose: 80 }, { glucose: 100 }, { glucose: 110 }, { glucose: 130 }, { glucose: 150 }, { glucose: 170 }, // target
      { glucose: 220 },       // 12.21 → high
      { glucose: 280 },       // 15.54 → very high
    ];
    const r = computeTIRFromReadings(readings);
    assert.ok(APPROX(r.timeBelowRangeCritical, 10));
    assert.ok(APPROX(r.timeBelowRange, 10));
    assert.ok(APPROX(r.timeInRange, 60));
    assert.ok(APPROX(r.timeAboveRange, 10));
    assert.ok(APPROX(r.timeAboveRangeHigh, 10));
  });
});

describe('TST-UNIT-005: resampleToBins (REQ-025)', () => {
  const t0 = new Date('2026-04-28T12:00:00Z').getTime();
  const r = (offMin, g) => ({ timestamp: new Date(t0 + offMin * 60000).toISOString(), glucose: g });

  it('returns input unchanged for fewer than 2 readings', () => {
    assert.deepEqual(resampleToBins([]), []);
    const single = [r(0, 100)];
    assert.deepEqual(resampleToBins(single), single);
  });

  it('averages multiple readings within a bin', () => {
    const readings = [r(0, 100), r(2, 120), r(4, 110), r(6, 200), r(8, 220)];
    const bins = resampleToBins(readings, 5);
    assert.equal(bins.length, 2);
    assert.ok(APPROX(bins[0].glucose, 110));  // avg of 100, 120, 110
    assert.ok(APPROX(bins[1].glucose, 210));  // avg of 200, 220
  });
});

describe('TST-UNIT-006: smoothBins triangular kernel (REQ-025)', () => {
  it('returns input for fewer than 3 bins', () => {
    const two = [{ glucose: 100 }, { glucose: 200 }];
    assert.deepEqual(smoothBins(two), two);
  });

  it('preserves DC level on flat input', () => {
    const flat = Array(10).fill().map(() => ({ glucose: 100 }));
    const out = smoothBins(flat);
    for (const b of out) assert.ok(APPROX(b.glucose, 100));
  });

  it('reduces magnitude of an impulse', () => {
    const arr = Array(10).fill().map(() => ({ glucose: 100 }));
    arr[5] = { glucose: 200 };
    const out = smoothBins(arr);
    // Smoothed peak should be lower than raw peak
    const peak = Math.max(...out.map(b => b.glucose));
    assert.ok(peak < 200, `expected peak<200, got ${peak}`);
    assert.ok(peak > 100, `expected peak>100, got ${peak}`);
  });
});

describe('TST-UNIT-007: smoothPath SVG syntax (REQ-025)', () => {
  it('returns empty string for fewer than 2 points', () => {
    assert.equal(smoothPath([]), '');
    assert.equal(smoothPath([{ x: 0, y: 0 }]), '');
  });

  it('produces a valid M ... C ... path string', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }];
    const d = smoothPath(pts);
    assert.match(d, /^M 0\.0,0\.0/);
    assert.equal((d.match(/ C /g) || []).length, pts.length - 1);
    assert.ok(!d.includes('NaN'));
  });
});

describe('TST-UNIT-008: bubbleClass mapping (REQ-027)', () => {
  it('maps mmol values to expected class', () => {
    assert.equal(bubbleClass(2.5), 'low');
    assert.equal(bubbleClass(3.5), 'low');
    assert.equal(bubbleClass(3.9), 'target');
    assert.equal(bubbleClass(10.0), 'target');
    assert.equal(bubbleClass(10.5), 'high');
    assert.equal(bubbleClass(13.9), 'high');
    assert.equal(bubbleClass(14.0), 'very-high');
  });
});

describe('TST-UNIT-009: latestNonNull traversal (REQ-023)', () => {
  it('returns null for empty array', () => {
    assert.equal(latestNonNull([], 'glucose'), null);
  });
  it('returns last non-null when last element is null', () => {
    const r = [{ hr: 70 }, { hr: 75 }, { hr: null }];
    assert.equal(latestNonNull(r, 'hr'), 75);
  });
  it('returns last value when all non-null', () => {
    const r = [{ hr: 70 }, { hr: 75 }, { hr: 80 }];
    assert.equal(latestNonNull(r, 'hr'), 80);
  });
  it('returns null when all null', () => {
    const r = [{ hr: null }, { hr: undefined }, { hr: null }];
    assert.equal(latestNonNull(r, 'hr'), null);
  });
});

describe('TST-UNIT-010: timeAgoStr boundaries (REQ-021)', () => {
  const NOW = new Date('2026-04-28T12:00:00Z').getTime();
  const at = (offsetMs) => new Date(NOW - offsetMs).toISOString();
  it('< 1 min → "just now"', () => {
    assert.equal(timeAgoStr(at(30 * 1000), NOW), 'just now');
  });
  it('1 min ago', () => {
    assert.equal(timeAgoStr(at(60 * 1000), NOW), '1 min ago');
  });
  it('30 min ago', () => {
    assert.equal(timeAgoStr(at(30 * 60 * 1000), NOW), '30 min ago');
  });
  it('1h ago', () => {
    assert.equal(timeAgoStr(at(60 * 60 * 1000), NOW), '1h ago');
  });
  it('5h ago', () => {
    assert.equal(timeAgoStr(at(5 * 60 * 60 * 1000), NOW), '5h ago');
  });
});

describe('TST-UNIT-011: safeToMmol input validation (REQ-080, RCM-01)', () => {
  it('returns null for null/undefined/NaN', () => {
    assert.equal(safeToMmol(null), null);
    assert.equal(safeToMmol(undefined), null);
    assert.equal(safeToMmol(NaN), null);
  });
  it('returns null for non-number types', () => {
    assert.equal(safeToMmol('100'), null);
    assert.equal(safeToMmol(true), null);
    assert.equal(safeToMmol({}), null);
  });
  it('returns null for negative values', () => {
    assert.equal(safeToMmol(-1), null);
    assert.equal(safeToMmol(-100), null);
  });
  it('returns null for values above 500 mg/dL', () => {
    assert.equal(safeToMmol(501), null);
    assert.equal(safeToMmol(1000), null);
  });
  it('returns null for Infinity', () => {
    assert.equal(safeToMmol(Infinity), null);
    assert.equal(safeToMmol(-Infinity), null);
  });
  it('converts valid values correctly', () => {
    assert.ok(APPROX(safeToMmol(18.0182), 1.0));
    assert.ok(APPROX(safeToMmol(100), 100 / 18.0182));
    assert.ok(APPROX(safeToMmol(0), 0));
    assert.ok(APPROX(safeToMmol(500), 500 / 18.0182));
  });
});

describe('TST-UNIT-012: glucoseState handles invalid input (REQ-024)', () => {
  it('returns "No data" for null', () => {
    assert.equal(glucoseState(null).status, 'No data');
  });
  it('returns "No data" for NaN', () => {
    assert.equal(glucoseState(NaN).status, 'No data');
  });
  it('returns "No data" for undefined', () => {
    assert.equal(glucoseState(undefined).status, 'No data');
  });
  it('still classifies valid values correctly', () => {
    assert.equal(glucoseState(2.5).cls, 'critical-low');
    assert.equal(glucoseState(5.0).cls, '');
    assert.equal(glucoseState(15.0).cls, 'critical-high');
  });
});
