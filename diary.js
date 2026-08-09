import { toMin, num, shiftKey, mean, meanOf } from "./time.js";

export const SHIFTS = [
  { id: "off", label: "Off" },
  { id: "early", label: "Early" },
  { id: "day", label: "Day" },
  { id: "late", label: "Late" },
  { id: "night", label: "Night" },
];

/**
 * One night, reduced to numbers.
 *   TIB = into bed -> out of bed
 *   TST = (lights out -> final wake) - time to fall asleep - time awake in night
 *   SE  = TST / TIB
 *
 * SE is deliberately null when bed times are missing. An estimated efficiency
 * is worse than no efficiency, because you'd make decisions on it.
 */
export function derive(e) {
  if (!e) return null;
  const lo = toMin(e.lightsOut);
  const fw = toMin(e.finalWake);
  if (lo == null || fw == null) return null;

  const inBed = toMin(e.inBed);
  const out = toMin(e.outOfBed);
  const sol = num(e.sol);
  const waso = num(e.waso);
  const nap = num(e.napMin);

  const opportunity = ((fw - lo) + 1440) % 1440;
  const tst = Math.max(0, opportunity - sol - waso);
  const tib = inBed != null && out != null ? ((out - inBed) + 1440) % 1440 : null;
  const se = tib && tib > 0 ? Math.min(100, (tst / tib) * 100) : null;

  return {
    tst, tib, se,
    total: tst + nap,
    onset: (lo + sol) % 1440,
    lo, fw, inBed, out, nap,
    partial: se == null,
  };
}

/**
 * Sleep debt over a rolling 14 nights.
 *
 * Last night carries 15% of the weight, the 13 before it share the remaining
 * 85% with recent nights heavier. Weights are normalised so an even shortfall
 * every night returns the plain sum of hours missed — the number stays
 * intuitive. Sleeping past your need pays debt back. Floors at zero.
 */
export function debtAt(entries, need, endKey) {
  const nights = [];
  for (let i = 0; i < 14; i++) {
    const d = derive(entries[shiftKey(endKey, -i)]);
    if (d) nights.push({ i, short: need - d.total });
  }
  if (!nights.length) return null;

  const r = 0.9;
  let tail = 0;
  for (let j = 1; j <= 13; j++) tail += Math.pow(r, j);

  let wSum = 0;
  let acc = 0;
  for (const { i, short } of nights) {
    const p = i === 0 ? 0.15 : (0.85 * Math.pow(r, i)) / tail;
    wSum += p;
    acc += p * short;
  }
  return Math.max(0, (acc / wSum) * nights.length);
}

/**
 * Sleep Regularity Index: the chance that any two moments 24 hours apart find
 * you in the same state. -100 (perfectly inverted day to day) to 100
 * (identical). Above 80 is the target. Five-minute epochs.
 *
 * Needs both a night and the following night to know what a given calendar day
 * looked like, since sleep straddles midnight.
 */
export function computeSRI(entries, endKey, span = 14) {
  const EP = 288;
  const keys = [];
  for (let i = span; i >= 0; i--) keys.push(shiftKey(endKey, -i));

  const state = {};
  for (const k of keys) {
    const cur = derive(entries[k]);
    const nxt = derive(entries[shiftKey(k, 1)]);
    if (!cur || !nxt) { state[k] = null; continue; }
    const arr = new Uint8Array(EP);
    const crossed = cur.onset > cur.fw;
    for (let t = crossed ? 0 : cur.onset; t < cur.fw; t += 5) arr[Math.floor(t / 5)] = 1;
    if (nxt.onset > nxt.fw) for (let t = nxt.onset; t < 1440; t += 5) arr[Math.floor(t / 5)] = 1;
    state[k] = arr;
  }

  let match = 0, total = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = state[keys[i]], b = state[keys[i + 1]];
    if (!a || !b) continue;
    for (let j = 0; j < EP; j++) { total++; if (a[j] === b[j]) match++; }
  }
  if (total < EP * 3) return null;
  return -100 + 200 * (match / total);
}

/**
 * Sleep restriction review. Window starts at your real average sleep time,
 * floor five hours, then weekly: 90%+ efficiency earns 15 minutes back,
 * 85-90% holds, under 85% gives 15 minutes up.
 */
export function srtReview(entries, srt, todayKey) {
  const nights = [];
  for (let i = 0; i < 7; i++) {
    const d = derive(entries[shiftKey(todayKey, -i)]);
    if (d && d.se != null) nights.push(d);
  }
  if (nights.length < 5) return { ready: false, nights: nights.length };

  const se = mean(nights.map((n) => n.se));
  let delta = 0, verdict = "hold";
  if (se >= 90) { delta = 15; verdict = "extend"; }
  else if (se < 85) { delta = -15; verdict = "tighten"; }

  return { ready: true, se, delta, verdict, next: Math.max(300, srt.windowMin + delta), nights: nights.length };
}

/* ------------------------------ correlations ------------------------------ */

export const FACTORS = [
  { id: "alcohol", label: "Alcohol", test: (e) => num(e.alcohol) > 0, min: 3 },
  { id: "lateCaf", label: "Caffeine after 2pm", min: 3,
    test: (e) => { const t = toMin(e.caffeineLast); return t != null && t >= 840 && t < 1320; } },
  { id: "trained", label: "Trained that day", test: (e) => !!e.trained, min: 3 },
  { id: "screens", label: "Screens in the last hour", test: (e) => !!e.screens, min: 3 },
  { id: "lightAm", label: "Morning outdoor light", test: (e) => !!e.lightAm, min: 3 },
];

/** With versus without, over the last 28 nights. Association, not cause. */
export function correlate(entries, todayKey, factor, span = 28) {
  const withF = [], without = [];
  for (let i = 0; i < span; i++) {
    const e = entries[shiftKey(todayKey, -i)];
    const d = derive(e);
    if (!d) continue;
    (factor.test(e) ? withF : without).push(d);
  }
  if (withF.length < factor.min || without.length < factor.min) return null;
  return {
    n: [withF.length, without.length],
    tst: [meanOf(withF.map((d) => d.total)), meanOf(without.map((d) => d.total))],
    se: [meanOf(withF.map((d) => d.se)), meanOf(without.map((d) => d.se))],
  };
}

export function byShift(entries, todayKey, span = 28) {
  return SHIFTS.map((s) => {
    const ds = [];
    for (let i = 0; i < span; i++) {
      const e = entries[shiftKey(todayKey, -i)];
      const d = derive(e);
      if (d && e.shift === s.id) ds.push(d);
    }
    return { s, n: ds.length, tst: meanOf(ds.map((d) => d.total)), se: meanOf(ds.map((d) => d.se)) };
  }).filter((r) => r.n >= 2);
}
