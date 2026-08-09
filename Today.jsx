import React from "react";
import SkyBand from "../components/SkyBand.jsx";
import { clockLabel, durLabel, dayLabel, toMin, meanOf } from "../lib/time.js";
import { PHASE_COPY, phaseAt, HABITS } from "../lib/circadian.js";

const WINDOWS = [
  ["morning", "Morning peak", "var(--dawn)"],
  ["dip", "Afternoon dip", "var(--coral)"],
  ["evening", "Evening peak", "var(--dawn)"],
  ["wind", "Wind down", "var(--mel)"],
  ["melatonin", "Melatonin window", "var(--mel)"],
];

export default function Today({
  now, today, debt, sri, need, recent, day, nowH, scrub, setScrub,
  entries, config, setEntry, goLog,
}) {
  const logged = recent.filter((r) => r.d).length;
  const h = scrub != null ? scrub : nowH;
  const phase = phaseAt(h, day.phases);
  const copy = PHASE_COPY[phase];
  const energy = Math.round(day.energyAt(h));

  const se7 = meanOf(recent.slice(0, 7).map((r) => r.d?.se ?? null));
  const srt = config.srt;
  const melStart = day.clock(day.phases.melatonin[0]);
  const prescribedBed = srt ? toMin(srt.wakeTime) - srt.windowMin : null;

  const habitTimes = {
    wake: day.clock(day.phases.inertia[0]),
    mel: day.clock(day.phases.melatonin[0]),
    wind: day.clock(day.phases.wind[0]),
    eve: day.clock(day.phases.evening[0] + 0.6),
  };
  const todayEntry = entries[today] || {};

  return (
    <>
      <div className="row" style={{ marginBottom: 18 }}>
        <span className="eyebrow">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <span className="eyebrow">{logged}/14 nights</span>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Sleep debt</div>
        {debt == null ? (
          <>
            <div className="hero-num muted">—</div>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0 16px" }}>
              Log one night and the number appears. Log five and it starts telling the truth.
            </p>
            <button className="btn" onClick={goLog}>Log last night</button>
          </>
        ) : (
          <>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div className="hero-num" style={{ color: debt > 300 ? "var(--coral)" : debt > 60 ? "var(--dawn)" : "var(--mint)" }}>
                {durLabel(debt)}
              </div>
              <div className="muted" style={{ textAlign: "right", fontSize: 12, lineHeight: 1.5 }}>
                owed over<br />14 nights
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "14px 0" }}>
              {debt < 60
                ? "You're square. Hold this wake time and the rest looks after itself."
                : debt < 300
                ? `An extra ${durLabel(Math.min(90, debt / 3))} a night for three nights clears most of this.`
                : `This is the size where focus and mood take the hit. Aim for ${durLabel(need + 60)} tonight, not a heroic lie-in on Sunday.`}
            </p>
            <div className="spark">
              {recent.slice().reverse().map((r) => {
                const pct = !r.d ? 0 : Math.max(6, Math.min(100, (r.d.total / (need * 1.3)) * 100));
                const col = !r.d ? "var(--surf2)"
                  : r.d.total >= need ? "var(--mint)"
                  : r.d.total >= need - 60 ? "var(--dawn)" : "var(--coral)";
                return <i key={r.key} style={{ height: `${pct}%`, background: col, opacity: r.d ? 1 : .5 }} title={dayLabel(r.key)} />;
              })}
            </div>
          </>
        )}
      </div>

      {(se7 != null || sri != null) && (
        <div className="card">
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Efficiency, 7d</div>
              <div className="med-num" style={{ color: se7 == null ? "var(--mute)" : se7 >= 90 ? "var(--mint)" : se7 >= 85 ? "var(--dawn)" : "var(--coral)" }}>
                {se7 == null ? "—" : `${Math.round(se7)}%`}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>asleep ÷ time in bed</div>
            </div>
            <div style={{ width: 1, background: "var(--line)" }} />
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Regularity</div>
              <div className="med-num" style={{ color: sri == null ? "var(--mute)" : sri >= 80 ? "var(--mint)" : sri >= 65 ? "var(--dawn)" : "var(--coral)" }}>
                {sri == null ? "—" : Math.round(sri)}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>above 80 is the target</div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        <SkyBand day={day} nowH={nowH} scrub={scrub} setScrub={setScrub} />
        <div className="row" style={{ marginTop: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>{copy.name}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3, maxWidth: 280 }}>{copy.note}</div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="mono" style={{ fontSize: 22 }}>{energy}</div>
            <div className="eyebrow">energy</div>
          </div>
        </div>
        {scrub != null && <button className="link" style={{ marginTop: 10 }} onClick={() => setScrub(null)}>Back to now</button>}
      </div>

      <div className="card">
        <h2 className="title">Tonight</h2>
        {srt ? (
          <>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="muted" style={{ fontSize: 13 }}>Prescribed window</span>
              <span className="mono" style={{ fontSize: 16 }}>{clockLabel(prescribedBed)} – {srt.wakeTime}</span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {durLabel(srt.windowMin)} in bed. Don't go in early, and get up at the wake time even if the night was
              bad. Your melatonin window opens {clockLabel(melStart)}.
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <span className="muted" style={{ fontSize: 13 }}>Melatonin window</span>
              <span className="mono" style={{ fontSize: 16 }}>{clockLabel(melStart)}</span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>
              Lights out here and sleep takes the least effort. If you're spending a lot of the night awake, the
              Plan tab can set you a tighter window instead.
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="title">Today's schedule</h2>
        {WINDOWS.map(([id, label, col]) => {
          const win = day.phases[id];
          return (
            <div className="rowline" key={id} style={{ opacity: nowH > win[1] ? .42 : 1 }}>
              <span className="dot" style={{ background: col }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15 }}>{label}</div>
                <div className="mono muted" style={{ fontSize: 12 }}>
                  {clockLabel(day.clock(win[0]))} – {clockLabel(day.clock(win[1]))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="title">Habits</h2>
        {HABITS.map((hb) => {
          const on = !!todayEntry.habits?.[hb.id];
          const toggle = () => setEntry(today, { habits: { ...(todayEntry.habits || {}), [hb.id]: !on } });
          return (
            <div
              className="habit" key={hb.id} role="checkbox" aria-checked={on} tabIndex={0}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
            >
              <span className={`box${on ? " on" : ""}`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, textDecoration: on ? "line-through" : "none", opacity: on ? .55 : 1 }}>{hb.label}</div>
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.45, marginTop: 2 }}>{hb.why}</div>
              </div>
              <span className="pill mono">{clockLabel(habitTimes[hb.anchor] + hb.offset * 60)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
