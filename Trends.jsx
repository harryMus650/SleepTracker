import React from "react";
import Stat from "../components/Stat.jsx";
import { debtAt, correlate, byShift, FACTORS } from "../lib/diary.js";
import { shiftKey, shortDay, durLabel, num, meanOf } from "../lib/time.js";

const W = 340, H = 110, P = 8;

export default function Trends({ recent, need, entries, today, sri }) {
  const logged = recent.filter((r) => r.d);

  if (!logged.length) {
    return (
      <>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Trends</div>
        <div className="card">
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Nothing to chart yet. Log a few nights and this fills in: hours against your need, debt over time,
            efficiency, regularity, and which of your habits is actually costing you sleep.
          </p>
        </div>
      </>
    );
  }

  const avg = meanOf(logged.map((r) => r.d.total));
  const avgSE = meanOf(logged.map((r) => r.d.se));
  const partial = logged.filter((r) => r.d.partial).length;
  const avgSOL = meanOf(recent.filter((r) => r.entry).map((r) => num(r.entry.sol)));
  const avgWASO = meanOf(recent.filter((r) => r.entry).map((r) => num(r.entry.waso)));
  const avgRested = meanOf(recent.filter((r) => r.entry?.rested).map((r) => num(r.entry.rested)));

  const series = [];
  for (let i = 13; i >= 0; i--) {
    const k = shiftKey(today, -i);
    series.push({ k, v: debtAt(entries, need, k) });
  }
  const maxDebt = Math.max(360, ...series.filter((d) => d.v != null).map((d) => d.v));
  const xs = (i) => P + (i / 13) * (W - P * 2);
  const ys = (v) => H - P - (v / maxDebt) * (H - P * 2);
  const pts = series.map((d, i) => (d.v == null ? null : `${xs(i).toFixed(1)},${ys(d.v).toFixed(1)}`)).filter(Boolean);
  const debtLine = pts.length ? "M" + pts.join(" L") : "";

  const corrs = FACTORS.map((f) => ({ f, r: correlate(entries, today, f) })).filter((c) => c.r);
  const shifts = byShift(entries, today);

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Trends</div>

      <div className="card">
        <h2 className="title">Debt over 14 days</h2>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label="Sleep debt trend">
          <line x1={P} y1={ys(0)} x2={W - P} y2={ys(0)} stroke="#2B3468" />
          <line x1={P} y1={ys(300)} x2={W - P} y2={ys(300)} stroke="#2B3468" strokeDasharray="3 4" />
          <text x={W - P} y={ys(300) - 4} fill="#8790C0" fontSize="9" textAnchor="end" fontFamily="ui-monospace, monospace">5h</text>
          {debtLine && <path d={debtLine} fill="none" stroke="#FFC46B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
          {series.map((d, i) => (d.v == null ? null : <circle key={d.k} cx={xs(i)} cy={ys(d.v)} r={i === 13 ? 4 : 2} fill="#FFC46B" />))}
        </svg>
      </div>

      <div className="card">
        <h2 className="title">Hours against your need</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
          {recent.slice().reverse().map((r) => {
            const pct = !r.d ? 4 : Math.max(5, Math.min(100, (r.d.total / (need * 1.35)) * 100));
            const col = !r.d ? "var(--surf2)"
              : r.d.total >= need ? "var(--mint)"
              : r.d.total >= need - 60 ? "var(--dawn)" : "var(--coral)";
            return (
              <div key={r.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: "100%", height: `${pct}%`, background: col, borderRadius: "3px 3px 0 0" }} />
                <span className="mono muted" style={{ fontSize: 8 }}>{shortDay(r.key)}</span>
              </div>
            );
          })}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
          Green met {durLabel(need)}. Amber within an hour. Coral is a night that cost you.
        </div>
      </div>

      <div className="card">
        <h2 className="title">The numbers</h2>
        <Stat label="Average sleep" value={avg == null ? "—" : durLabel(avg)} sub={`need ${durLabel(need)}`} />
        <Stat
          label="Sleep efficiency"
          value={avgSE == null ? "—" : `${Math.round(avgSE)}%`}
          sub={avgSE == null ? "no nights with bed times yet"
            : `${avgSE >= 90 ? "consolidated" : avgSE >= 85 ? "healthy range" : "below the clinical threshold"}${partial ? ` · ${partial} night${partial === 1 ? "" : "s"} excluded` : ""}`}
        />
        <Stat label="Sleep regularity" value={sri == null ? "—" : Math.round(sri)}
          sub={sri == null ? "needs a fortnight of nights"
            : sri >= 80 ? "steady clock" : sri >= 65 ? "a bit loose" : "your clock is being dragged around"} />
        <Stat label="Time to fall asleep" value={avgSOL == null ? "—" : `${Math.round(avgSOL)} min`} sub="under 20 is normal" />
        <Stat label="Awake in the night" value={avgWASO == null ? "—" : `${Math.round(avgWASO)} min`} sub="under 30 is normal" />
        <Stat label="Felt rested" value={avgRested == null ? "—" : `${avgRested.toFixed(1)} / 5`} />
        <Stat label="Nights on target" value={`${logged.filter((r) => r.d.total >= need).length} of ${logged.length}`} />
      </div>

      {corrs.length > 0 && (
        <div className="card">
          <h2 className="title">What moves the needle</h2>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: -4 }}>
            Last 28 nights, with versus without. These are your own patterns, not proof of cause.
          </p>
          {corrs.map(({ f, r }) => {
            const dTst = (r.tst[0] ?? 0) - (r.tst[1] ?? 0);
            const dSe = r.se[0] != null && r.se[1] != null ? r.se[0] - r.se[1] : NaN;
            return (
              <div className="rowline" key={f.id} style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5 }}>{f.label}</div>
                  <div className="muted mono" style={{ fontSize: 11, marginTop: 3 }}>{r.n[0]} vs {r.n[1]} nights</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 14, color: dTst >= 0 ? "var(--mint)" : "var(--coral)" }}>
                    {dTst >= 0 ? "+" : ""}{durLabel(dTst)}
                  </div>
                  <div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>
                    {Number.isFinite(dSe) ? `${dSe >= 0 ? "+" : ""}${dSe.toFixed(1)}% eff` : "no eff data"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {shifts.length > 1 && (
        <div className="card">
          <h2 className="title">By shift</h2>
          {shifts.map((r) => (
            <div className="rowline" key={r.s.id}>
              <div style={{ flex: 1, fontSize: 14.5 }}>{r.s.label}</div>
              <span className="mono muted" style={{ fontSize: 11 }}>{r.n}n</span>
              <span className="mono" style={{ fontSize: 14, width: 56, textAlign: "right" }}>
                {r.tst == null ? "—" : durLabel(r.tst)}
              </span>
              <span className="mono muted" style={{ fontSize: 12, width: 40, textAlign: "right" }}>
                {r.se == null ? "" : `${Math.round(r.se)}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
