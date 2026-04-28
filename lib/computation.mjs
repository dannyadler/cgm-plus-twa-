// Pure computation functions for Trinity CGM Plus.
//
// Extracted from index.html to enable unit testing per TCG-REG-05 STD.
// This module is the source of truth for the computation logic.
// As of v0.1, index.html still inlines duplicates; productization step 1 is
// to have index.html load this module via <script type="module"> and remove
// the duplicates.

/** Convert milligrams-per-deciliter glucose to millimoles-per-liter. REQ-080, RCM-01. */
export function toMmol(mgdl) {
  return mgdl / 18.0182;
}

/** Classify a mmol/L glucose value into a state class. REQ-024. */
export function glucoseState(mmol) {
  if (mmol < 3.0) return { cls: 'critical-low', status: 'Critically Low. Act now' };
  if (mmol < 3.9) return { cls: 'low', status: 'Low' };
  if (mmol <= 10.0) return { cls: '', status: 'Normal' };
  if (mmol <= 13.9) return { cls: 'high', status: 'High' };
  return { cls: 'critical-high', status: 'Critically High. Act now' };
}

/** Map mmol/L to a bubble class for the weekly average view. REQ-027. */
export function bubbleClass(mmol) {
  if (mmol < 3.9) return 'low';
  if (mmol <= 10.0) return 'target';
  if (mmol <= 13.9) return 'high';
  return 'very-high';
}

/**
 * Compute trend direction and rate from the last two readings.
 * REQ-022. Known limitation per RISK-09: noisy on high-frequency input.
 * Future RCM-15 will replace with smoothed-window slope.
 */
export function computeTrend(readings) {
  if (readings.length < 2) return { arrow: '→', text: 'Steady', rate: 0 };
  const last = readings[readings.length - 1];
  const prev = readings[readings.length - 2];
  const dtMin = (new Date(last.timestamp) - new Date(prev.timestamp)) / 60000;
  if (dtMin <= 0) return { arrow: '→', text: 'Steady', rate: 0 };
  const rate = (toMmol(last.glucose) - toMmol(prev.glucose)) / dtMin;
  const abs = Math.abs(rate);
  let arrow = '→', text = 'Steady';
  if (abs >= 0.17) { arrow = rate > 0 ? '↑' : '↓'; text = rate > 0 ? 'Rising fast' : 'Falling fast'; }
  else if (abs >= 0.11) { arrow = rate > 0 ? '↗' : '↘'; text = rate > 0 ? 'Rising' : 'Falling'; }
  else if (abs >= 0.06) { arrow = rate > 0 ? '↗' : '↘'; text = rate > 0 ? 'Rising slowly' : 'Falling slowly'; }
  return { arrow, text, rate };
}

/** Format a freshness indicator for a timestamp. REQ-021. */
export function timeAgoStr(ts, now = Date.now()) {
  const mins = Math.floor((now - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ago`;
}

/**
 * Compute Time in Range percentages from a reading list.
 * REQ-024. Known limitation per RISK-07: row-weighted, not time-weighted.
 * Future RCM-13 will replace with time-weighted aggregation.
 */
export function computeTIRFromReadings(readings) {
  if (!readings.length) return null;
  let vl = 0, l = 0, t = 0, h = 0, vh = 0;
  readings.forEach(r => {
    const m = toMmol(r.glucose);
    if (m < 3.0) vl++;
    else if (m < 3.9) l++;
    else if (m <= 10.0) t++;
    else if (m <= 13.9) h++;
    else vh++;
  });
  const n = readings.length;
  return {
    timeBelowRangeCritical: (vl / n) * 100,
    timeBelowRange: (l / n) * 100,
    timeInRange: (t / n) * 100,
    timeAboveRange: (h / n) * 100,
    timeAboveRangeHigh: (vh / n) * 100,
  };
}

/**
 * Find the most recent non-null value of a named field in a readings list.
 * REQ-023. Traverses from end to start.
 */
export function latestNonNull(readings, field) {
  for (let i = readings.length - 1; i >= 0; i--) {
    if (readings[i][field] != null) return readings[i][field];
  }
  return null;
}

/**
 * Resample readings into fixed-width time bins.
 * REQ-025 step 1.
 */
export function resampleToBins(readings, binMinutes = 5) {
  if (readings.length < 2) return readings;
  const binMs = binMinutes * 60 * 1000;
  const t0 = new Date(readings[0].timestamp).getTime();
  const tN = new Date(readings[readings.length - 1].timestamp).getTime();
  const bins = [];
  for (let edge = t0; edge <= tN; edge += binMs) {
    bins.push({ start: edge, end: edge + binMs, sum: 0, count: 0 });
  }
  for (const r of readings) {
    const t = new Date(r.timestamp).getTime();
    const idx = Math.min(Math.floor((t - t0) / binMs), bins.length - 1);
    bins[idx].sum += r.glucose;
    bins[idx].count++;
  }
  return bins
    .filter(b => b.count > 0)
    .map(b => ({
      timestamp: new Date(b.start + (b.end - b.start) / 2).toISOString(),
      glucose: b.sum / b.count,
    }));
}

/**
 * Triangular-kernel weighted moving average. Two passes for extra smoothness.
 * REQ-025 step 2.
 */
export function smoothBins(bins, radius = 2) {
  if (bins.length < 3) return bins;
  const pass = (arr) => arr.map((b, i) => {
    let wSum = 0, wTotal = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(arr.length - 1, i + radius); j++) {
      const w = radius + 1 - Math.abs(j - i);
      wSum += arr[j].glucose * w;
      wTotal += w;
    }
    return { ...b, glucose: wSum / wTotal };
  });
  return pass(pass(bins));
}

/**
 * Catmull-Rom cubic-bezier SVG path through a set of points.
 * REQ-025 step 3.
 */
export function smoothPath(points, tension = 0.35) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
