export const pad = (n) => String(n).padStart(2, "0");

export const num = (v) =>
  v === "" || v == null || Number.isNaN(Number(v)) ? 0 : Number(v);

/** "23:15" -> 1395 minutes past midnight. Null if unparseable. */
export function toMin(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** 1395 -> "23:15". Wraps across midnight. */
export function toHHMM(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function clockLabel(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${pad(mm)}${ap}`;
}

export function durLabel(mins) {
  const neg = mins < 0;
  const a = Math.abs(Math.round(mins));
  const h = Math.floor(a / 60);
  const m = a % 60;
  const s = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  return neg ? `-${s}` : s;
}

export const dateKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function keyToDate(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(k, days) {
  const d = keyToDate(k);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export const daysBetween = (a, b) =>
  Math.round((keyToDate(b) - keyToDate(a)) / 86400000);

export const dayLabel = (k) =>
  keyToDate(k).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export const shortDay = (k) =>
  keyToDate(k).toLocaleDateString(undefined, { weekday: "narrow" });

/** Circular mean of minute-of-day values. 23:50 and 00:10 average to midnight. */
export function meanTime(list) {
  if (!list.length) return null;
  let x = 0, y = 0;
  for (const m of list) {
    const a = (m / 1440) * Math.PI * 2;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return list[0];
  let a = Math.atan2(y / list.length, x / list.length);
  if (a < 0) a += Math.PI * 2;
  return (a / (Math.PI * 2)) * 1440;
}

export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/** Mean that drops nulls and NaN rather than poisoning the result. */
export function meanOf(a) {
  const v = a.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
