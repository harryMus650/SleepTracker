import React, { useState } from "react";
import Stat from "../components/Stat.jsx";
import { durLabel } from "../lib/time.js";
import { derive } from "../lib/diary.js";
import { DEFAULT_DATA, importInto, toCSV, download, listBackups } from "../lib/store.js";
import * as notify from "../lib/notify.js";

export default function Setup({ data, save, entries, day }) {
  const [need, setNeed] = useState(data.config.sleepNeed);
  const [wakeGoal, setWakeGoal] = useState(data.config.wakeGoal);
  const [confirm, setConfirm] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [perm, setPerm] = useState(notify.permission());

  const dirty = need !== data.config.sleepNeed || wakeGoal !== data.config.wakeGoal;
  const backups = listBackups();
  const stamp = new Date().toISOString().slice(0, 10);

  const enableReminders = async () => {
    const p = await notify.requestPermission();
    setPerm(p);
    if (p === "granted") {
      save({ ...data, config: { ...data.config, reminders: true } });
      if (day) notify.scheduleTonight(day, { enabled: true });
    }
  };

  const runImport = () => {
    const res = importInto(data, paste);
    setMsg(res.msg);
    if (res.ok) { save(res.data); setPaste(""); }
  };

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Setup</div>

      <div className="card">
        <h2 className="title">Sleep need</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 13 }}>Hours your body actually wants</span>
          <span className="mono" style={{ fontSize: 18 }}>{durLabel(need)}</span>
        </div>
        <input type="range" min="360" max="600" step="15" value={need} onChange={(e) => setNeed(Number(e.target.value))} />
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 12 }}>
          Most adults sit between 7 and 9 hours and it's largely genetic. Training hard pushes it up. A rough test:
          on a stretch with no alarm, what do you settle at by the fourth or fifth morning?
        </p>
      </div>

      <div className="card">
        <h2 className="title">Wake goal</h2>
        <input type="time" value={wakeGoal} onChange={(e) => setWakeGoal(e.target.value)} />
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 12 }}>
          Used before there's data, and as the fixed end of your sleep window. Once you have a week logged, your
          circadian schedule anchors to your real average wake time instead, so shift work shows up honestly rather
          than being smoothed over.
        </p>
      </div>

      {dirty && (
        <button className="btn" style={{ marginBottom: 14 }}
          onClick={() => save({ ...data, config: { ...data.config, sleepNeed: need, wakeGoal } })}>
          Save changes
        </button>
      )}

      <div className="card">
        <h2 className="title">Reminders</h2>
        {perm === "granted" ? (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 14.5 }}>Wind down and melatonin window</span>
              <button className="chip" data-on={!!data.config.reminders}
                onClick={() => save({ ...data, config: { ...data.config, reminders: !data.config.reminders } })}>
                {data.config.reminders ? "On" : "Off"}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              These are local timers, not push. They fire reliably on Android and desktop once installed. On iPhone
              they need the app added to your home screen and opened at some point that day. If you want a nudge
              that fires no matter what, a phone alarm at your wind-down time beats any web app — this is the honest
              limit of the platform, not something I can engineer around.
            </p>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginTop: -4 }}>
              Two nudges a day: wind down, and the melatonin window opening. The schedule is useless if it only
              reaches you when you're already looking at it.
            </p>
            <button className="btn" onClick={enableReminders} disabled={perm === "denied" || perm === "unsupported"}>
              {perm === "denied" ? "Blocked in browser settings" : perm === "unsupported" ? "Not supported here" : "Turn on reminders"}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="title">Your data</h2>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 0 }}>
          {Object.keys(entries).length} days recorded, {(data.checkins || []).length} check-ins. Stored on this
          device only — nothing leaves it, and nothing syncs. Export is how you move it.
        </p>

        <div className="grid2" style={{ marginBottom: 12 }}>
          <button className="btn ghost" onClick={() => download(`sleep-lab-${stamp}.json`, JSON.stringify(data, null, 2))}>
            Download JSON
          </button>
          <button className="btn ghost" onClick={() => download(`sleep-lab-${stamp}.csv`, toCSV(entries, derive), "text/csv")}>
            Download CSV
          </button>
        </div>

        <details style={{ marginBottom: 14 }}>
          <summary>Import or restore</summary>
          <div style={{ paddingTop: 12 }}>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 0 }}>
              Paste a JSON export. Takes this app's format or the older tracker's. Nights you've already logged
              won't be overwritten.
            </p>
            <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setMsg(""); }}
              placeholder='{"entries": { "2026-08-07": { … } } }' style={{ marginBottom: 10 }} />
            <button className="btn ghost" disabled={!paste.trim()} onClick={runImport}>Import</button>
            {msg && <div className="flag" style={{ marginTop: 12 }}>{msg}</div>}
          </div>
        </details>

        {backups.length > 0 && (
          <details style={{ marginBottom: 14 }}>
            <summary>Automatic backups</summary>
            <div style={{ paddingTop: 12 }}>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 0 }}>
                A snapshot is kept each day you use the app. Download one if something goes wrong, then paste it
                back through Import.
              </p>
              {backups.slice().reverse().map((b) => (
                <div className="rowline" key={b.at}>
                  <div style={{ flex: 1 }}>
                    <div className="mono" style={{ fontSize: 13 }}>{b.date}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{b.nights} nights</div>
                  </div>
                  <button className="link" onClick={() => download(`sleep-lab-backup-${b.date}.json`, b.json)}>Download</button>
                </div>
              ))}
            </div>
          </details>
        )}

        {!confirm ? (
          <button className="btn ghost" onClick={() => setConfirm(true)}>Erase everything</button>
        ) : (
          <div className="grid2">
            <button className="btn ghost" onClick={() => setConfirm(false)}>Keep it</button>
            <button className="btn" style={{ background: "var(--coral)", color: "#2A0C06" }}
              onClick={() => { save({ ...DEFAULT_DATA }); setConfirm(false); }}>
              Erase
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="title">What the numbers mean</h2>
        <Stat label="Sleep debt" value="hours" sub="Weighted 14-night shortfall. Last night counts most." />
        <Stat label="Efficiency" value="%" sub="Asleep ÷ time in bed. Under 85% is the clinical flag." />
        <Stat label="Regularity" value="0–100" sub="Odds any two points 24h apart match. Above 80 is the target." />
        <Stat label="Energy" value="0–100" sub="Modelled from your wake time and debt, not measured." />
      </div>

      <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.65, padding: "0 4px 24px" }}>
        This estimates your rhythm from the times you enter. It isn't a medical device and it can't detect apnoea.
        Loud snoring, gasping or stopping breathing in the night, falling asleep at the wheel, or exhaustion that
        survives a fortnight of good nights all need a GP, not an app.
      </p>
    </>
  );
}
