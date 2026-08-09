/**
 * Storage.
 *
 * The whole point of this file: your data outlives the code. Every shape change
 * gets a migration and a version bump, so upgrading the app never costs you a
 * night of logs again. Keys are namespaced `sleep:` to sit alongside Baseline's
 * other modules (`intake:` and so on) in the same origin without collisions.
 */

const NS = "sleep:";
const DATA_KEY = `${NS}data`;
const BACKUP_KEY = `${NS}backups`;
const SCHEMA = 3;
const MAX_BACKUPS = 8;

export const DEFAULT_DATA = {
  schema: SCHEMA,
  config: { sleepNeed: 480, wakeGoal: "06:30", srt: null, reminders: true },
  entries: {},
  checkins: [],
};

/* ------------------------------ migrations -------------------------------
   Each function takes the previous shape and returns the next one. They run
   in order, so a v1 payload from two years ago still lands correctly.       */

const MIGRATIONS = {
  // v1: the first tracker. { bed, wake, awake, nap, quality, habits }
  1: (d) => ({
    ...d,
    entries: Object.fromEntries(
      Object.entries(d.entries || {}).map(([k, o]) => [
        k,
        {
          lightsOut: o.bed || "",
          finalWake: o.wake || "",
          sol: 0, // v1 never asked how long you took to fall asleep
          waso: o.awake ?? 0,
          napMin: o.nap ?? 0,
          quality: o.quality ?? 3,
          habits: o.habits || {},
          fromV1: true,
        },
      ])
    ),
    schema: 2,
  }),
  // v2 -> v3: reminders opt-in added to config
  2: (d) => ({
    ...d,
    config: { reminders: true, ...d.config },
    checkins: d.checkins || [],
    schema: 3,
  }),
};

function migrate(raw) {
  let d = { ...raw };
  let v = d.schema || 1;
  while (v < SCHEMA) {
    const step = MIGRATIONS[v];
    if (!step) break;
    d = step(d);
    v = d.schema || v + 1;
  }
  return {
    ...DEFAULT_DATA,
    ...d,
    schema: SCHEMA,
    config: { ...DEFAULT_DATA.config, ...(d.config || {}) },
    entries: d.entries || {},
    checkins: d.checkins || [],
  };
}

/* ------------------------------- read/write ------------------------------ */

export function load() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.error("Could not read saved data, starting fresh:", e);
    return { ...DEFAULT_DATA };
  }
}

export function save(data) {
  const payload = { ...data, schema: SCHEMA };
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
}

/* -------------------------------- backups --------------------------------
   A rolling set of snapshots, one per day at most. Cheap insurance against a
   bad import or a mistaken wipe.                                            */

export function snapshot(data) {
  try {
    const list = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    const today = new Date().toISOString().slice(0, 10);
    if (list.length && list[list.length - 1].date === today) return;
    list.push({ date: today, at: Date.now(), json: JSON.stringify(data) });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(-MAX_BACKUPS)));
  } catch (e) {
    /* backups are best-effort, never block a save */
  }
}

export function listBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]").map((b) => ({
      date: b.date,
      at: b.at,
      nights: Object.keys(JSON.parse(b.json).entries || {}).length,
      json: b.json,
    }));
  } catch (e) {
    return [];
  }
}

/* ---------------------------- import and export -------------------------- */

/** Accepts this app's export, a bare entries object, or a v1 payload. */
export function importInto(current, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, msg: "That isn't valid JSON. Copy the whole thing, braces included." };
  }
  const src = parsed.entries || parsed;
  if (typeof src !== "object" || Array.isArray(src)) {
    return { ok: false, msg: "Couldn't find any nights in that." };
  }
  const merged = { ...current.entries };
  let added = 0;
  for (const k of Object.keys(src)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const o = src[k];
    if (!o || typeof o !== "object") continue;
    const existing = merged[k];
    if (existing && (existing.lightsOut || existing.finalWake)) continue; // never clobber
    const conv =
      o.bed || o.wake
        ? {
            lightsOut: o.bed || "",
            finalWake: o.wake || "",
            sol: 0,
            waso: o.awake ?? 0,
            napMin: o.nap ?? 0,
            quality: o.quality ?? 3,
            habits: o.habits || {},
            fromV1: true,
          }
        : o;
    if (!conv.lightsOut && !conv.finalWake) continue;
    merged[k] = { ...(existing || {}), ...conv };
    added++;
  }
  if (!added) return { ok: false, msg: "Nothing new in there — those nights are already saved." };
  return {
    ok: true,
    msg: `Added ${added} night${added === 1 ? "" : "s"}.`,
    data: { ...current, entries: merged, checkins: parsed.checkins || current.checkins },
  };
}

export function toCSV(entries, derive) {
  const cols = [
    "date", "inBed", "lightsOut", "sol", "awakenings", "waso", "finalWake",
    "outOfBed", "napMin", "quality", "rested", "shift", "caffeineLast",
    "alcohol", "trained", "screens", "lightAm", "rhr", "hrv",
  ];
  const rows = Object.keys(entries).sort().map((k) => {
    const e = entries[k];
    const d = derive(e);
    const cells = cols.slice(1).map((c) => {
      const v = e[c];
      if (v == null) return "";
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    });
    return [k, ...cells, d ? Math.round(d.total) : "", d && d.se != null ? Math.round(d.se) : ""].join(",");
  });
  return [[...cols, "totalSleepMin", "efficiency"].join(","), ...rows].join("\n");
}

/** Triggers a real file download rather than a clipboard copy. */
export function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
