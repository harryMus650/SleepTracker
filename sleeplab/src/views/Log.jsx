import React, { useState, useEffect } from "react";
import { derive, SHIFTS } from "../lib/diary.js";
import { toMin, toHHMM, num, shiftKey, keyToDate, dayLabel, shortDay, durLabel } from "../lib/time.js";

const BLANK = {
  inBed: "22:45", lightsOut: "23:00", sol: 15, awakenings: 0, waso: 0,
  finalWake: "06:30", outOfBed: "06:45", napMin: 0, quality: 3, rested: 3,
  shift: "day", caffeineLast: "", alcohol: 0,
  trained: false, screens: false, lightAm: false, rhr: "", hrv: "", notes: "",
};

const QUALITY = ["rough", "broken", "ok", "solid", "excellent"];
const RESTED = ["wrecked", "flat", "ok", "good", "sharp"];

export default function Log({ today, entries, need, setEntry, config }) {
  const [target, setTarget] = useState(today);
  const [form, setForm] = useState({ ...BLANK, finalWake: config.wakeGoal });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cur = entries[target] || {};
    const base = { ...BLANK, finalWake: config.wakeGoal, ...cur };
    // Imported nights have no in/out-of-bed time. Offer a 15 min guess either side.
    if (cur.fromV1) {
      if (!cur.inBed && cur.lightsOut) base.inBed = toHHMM(toMin(cur.lightsOut) - 15);
      if (!cur.outOfBed && cur.finalWake) base.outOfBed = toHHMM(toMin(cur.finalWake) + 15);
    }
    setForm(base);
    setSaved(false);
  }, [target, entries, config.wakeGoal]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const d = derive(form);

  const nights = [];
  for (let i = 0; i < 14; i++) {
    const k = shiftKey(today, -i);
    nights.push({ key: k, d: derive(entries[k]) });
  }

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Sleep diary</div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <label className="f" htmlFor="date">Morning you woke up</label>
          <input id="date" type="date" value={target} max={today}
            onChange={(e) => e.target.value && setTarget(e.target.value)} />
        </div>

        {entries[target]?.fromV1 && (
          <div className="flag" style={{ marginBottom: 16 }}>
            Imported night. The bed times below are a 15-minute guess either side of your sleep, and there's no
            record of how long you took to drop off. Correct what you remember and it joins the efficiency numbers.
          </div>
        )}

        <div className="grid2" style={{ marginBottom: 12 }}>
          <div>
            <label className="f" htmlFor="inBed">Got into bed</label>
            <input id="inBed" type="time" value={form.inBed} onChange={(e) => set("inBed", e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="lightsOut">Lights out</label>
            <input id="lightsOut" type="time" value={form.lightsOut} onChange={(e) => set("lightsOut", e.target.value)} />
          </div>
        </div>

        <div className="grid2" style={{ marginBottom: 12 }}>
          <div>
            <label className="f" htmlFor="sol">Minutes to fall asleep</label>
            <input id="sol" type="number" min="0" max="300" step="5" value={form.sol} onChange={(e) => set("sol", e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="awk">Times you woke</label>
            <input id="awk" type="number" min="0" max="20" value={form.awakenings} onChange={(e) => set("awakenings", e.target.value)} />
          </div>
        </div>

        <div className="grid2" style={{ marginBottom: 12 }}>
          <div>
            <label className="f" htmlFor="waso">Minutes awake in the night</label>
            <input id="waso" type="number" min="0" max="400" step="5" value={form.waso} onChange={(e) => set("waso", e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="nap">Nap (min)</label>
            <input id="nap" type="number" min="0" max="240" step="5" value={form.napMin} onChange={(e) => set("napMin", e.target.value)} />
          </div>
        </div>

        <div className="grid2" style={{ marginBottom: 16 }}>
          <div>
            <label className="f" htmlFor="fw">Final wake</label>
            <input id="fw" type="time" value={form.finalWake} onChange={(e) => set("finalWake", e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="oob">Out of bed</label>
            <input id="oob" type="time" value={form.outOfBed} onChange={(e) => set("outOfBed", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="f" htmlFor="q">Sleep quality — {QUALITY[num(form.quality) - 1] || "ok"}</label>
          <input id="q" type="range" min="1" max="5" value={form.quality} onChange={(e) => set("quality", Number(e.target.value))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="f" htmlFor="r">How rested you felt — {RESTED[num(form.rested) - 1] || "ok"}</label>
          <input id="r" type="range" min="1" max="5" value={form.rested} onChange={(e) => set("rested", Number(e.target.value))} />
        </div>

        {d && (
          <div style={{ background: "var(--surf2)", borderRadius: 12, padding: 13, marginBottom: 16 }}>
            <div className="row" style={{ marginBottom: 7 }}>
              <span className="muted" style={{ fontSize: 13 }}>Asleep</span>
              <span className="mono" style={{ fontSize: 15 }}>
                {durLabel(d.total)}{" "}
                <span style={{ color: d.total >= need ? "var(--mint)" : "var(--coral)" }}>
                  ({d.total - need >= 0 ? "+" : ""}{durLabel(d.total - need)})
                </span>
              </span>
            </div>
            <div className="row">
              <span className="muted" style={{ fontSize: 13 }}>Efficiency</span>
              {d.se == null ? (
                <span className="muted mono" style={{ fontSize: 13 }}>needs bed times</span>
              ) : (
                <span className="mono" style={{ fontSize: 15, color: d.se >= 90 ? "var(--mint)" : d.se >= 85 ? "var(--dawn)" : "var(--coral)" }}>
                  {Math.round(d.se)}%
                </span>
              )}
            </div>
          </div>
        )}

        <details style={{ marginBottom: 16 }}>
          <summary>The day before</summary>
          <div style={{ paddingTop: 14 }}>
            <label className="f">Shift</label>
            <div className="chips" style={{ marginBottom: 14 }}>
              {SHIFTS.map((s) => (
                <button key={s.id} className="chip" data-on={form.shift === s.id} onClick={() => set("shift", s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div>
                <label className="f" htmlFor="caf">Last caffeine</label>
                <input id="caf" type="time" value={form.caffeineLast} onChange={(e) => set("caffeineLast", e.target.value)} />
              </div>
              <div>
                <label className="f" htmlFor="alc">Standard drinks</label>
                <input id="alc" type="number" min="0" max="20" value={form.alcohol} onChange={(e) => set("alcohol", e.target.value)} />
              </div>
            </div>
            <div className="chips">
              {[["trained", "Trained"], ["screens", "Screens in last hour"], ["lightAm", "Morning light"]].map(([k, l]) => (
                <button key={k} className="chip" data-on={!!form[k]} onClick={() => set(k, !form[k])}>{l}</button>
              ))}
            </div>
          </div>
        </details>

        <details style={{ marginBottom: 16 }}>
          <summary>Wearable and notes</summary>
          <div style={{ paddingTop: 14 }}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div>
                <label className="f" htmlFor="rhr">Resting HR</label>
                <input id="rhr" type="number" min="30" max="120" value={form.rhr} onChange={(e) => set("rhr", e.target.value)} />
              </div>
              <div>
                <label className="f" htmlFor="hrv">HRV (ms)</label>
                <input id="hrv" type="number" min="5" max="300" value={form.hrv} onChange={(e) => set("hrv", e.target.value)} />
              </div>
            </div>
            <label className="f" htmlFor="notes">Notes</label>
            <textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Woke at 3, callout, hot room…" />
          </div>
        </details>

        <button className="btn" onClick={() => { setEntry(target, form); setSaved(true); }}>
          {saved ? "Saved" : `Save ${target === today ? "last night" : dayLabel(target)}`}
        </button>
      </div>

      <div className="card">
        <h2 className="title">Last 14 nights</h2>
        {nights.map((n) => {
          const pct = !n.d ? 0 : Math.min(100, (n.d.total / (need * 1.25)) * 100);
          const col = !n.d ? "var(--surf2)"
            : n.d.total >= need ? "var(--mint)"
            : n.d.total >= need - 60 ? "var(--dawn)" : "var(--coral)";
          return (
            <div className="rowline" key={n.key} onClick={() => setTarget(n.key)} style={{ cursor: "pointer" }}>
              <span className="mono muted" style={{ fontSize: 12, width: 48, flex: "none" }}>
                {shortDay(n.key)} {keyToDate(n.key).getDate()}
              </span>
              <span className="bar"><span style={{ width: `${pct}%`, background: col }} /></span>
              <span className="mono" style={{ fontSize: 12.5, width: 46, textAlign: "right", flex: "none", color: n.d ? "var(--text)" : "var(--mute)" }}>
                {n.d ? durLabel(n.d.total) : "—"}
              </span>
              <span className="mono muted" style={{ fontSize: 12, width: 34, textAlign: "right", flex: "none" }}>
                {n.d ? (n.d.se == null ? "···" : `${Math.round(n.d.se)}%`) : ""}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
