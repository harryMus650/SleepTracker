import React, { useState } from "react";
import { derive, srtReview } from "../lib/diary.js";
import { shiftKey, daysBetween, dayLabel, clockLabel, durLabel, toMin, mean, meanOf } from "../lib/time.js";

/**
 * The seven questions are written in plain language covering the same domains
 * as the standard insomnia severity screen — onset, maintenance, early waking,
 * satisfaction, daytime interference, how visible it is, and distress. It is
 * deliberately not a reproduction of any clinical instrument, and the score is
 * a trend line for you, not a diagnosis.
 */
const ITEMS = [
  { id: "onset", q: "Trouble getting to sleep", scale: ["None", "Mild", "Moderate", "Severe", "Very severe"] },
  { id: "maint", q: "Trouble staying asleep", scale: ["None", "Mild", "Moderate", "Severe", "Very severe"] },
  { id: "early", q: "Waking too early and not getting back", scale: ["None", "Mild", "Moderate", "Severe", "Very severe"] },
  { id: "satis", q: "How unhappy are you with your sleep right now", scale: ["Not at all", "A little", "Somewhat", "Quite", "Very"] },
  { id: "interf", q: "How much is it dragging on your day", scale: ["Not at all", "A little", "Somewhat", "Quite a bit", "A lot"] },
  { id: "notice", q: "How obvious is it to people around you", scale: ["Not at all", "A little", "Somewhat", "Quite", "Very"] },
  { id: "worry", q: "How much are you worrying about it", scale: ["Not at all", "A little", "Somewhat", "Quite", "Very"] },
];

const band = (v) => (v <= 7 ? "no real problem" : v <= 14 ? "mild trouble" : v <= 21 ? "moderate trouble" : "severe trouble");

export default function Plan({ data, save, entries, today }) {
  const srt = data.config.srt;
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState({});

  const last7 = [];
  for (let i = 0; i < 7; i++) {
    const d = derive(entries[shiftKey(today, -i)]);
    if (d) last7.push(d);
  }
  const baseTST = mean(last7.map((d) => d.total));
  const baseSE = meanOf(last7.map((d) => d.se));
  const complete7 = last7.filter((d) => d.se != null);

  const review = srt ? srtReview(entries, srt, today) : null;
  const daysSince = srt ? daysBetween(srt.lastReview, today) : 0;
  const startWindow = Math.max(300, Math.round((baseTST || 360) / 15) * 15);

  const startSRT = () =>
    save({
      ...data,
      config: { ...data.config, srt: { wakeTime: data.config.wakeGoal, windowMin: startWindow, started: today, lastReview: today } },
    });

  const applyReview = () =>
    save({ ...data, config: { ...data.config, srt: { ...srt, windowMin: review.next, lastReview: today } } });

  const checkins = data.checkins || [];
  const latest = checkins[checkins.length - 1];
  const total = ITEMS.reduce((s, it) => s + (answers[it.id] ?? 0), 0);
  const complete = ITEMS.every((it) => answers[it.id] != null);

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Plan</div>

      <div className="card">
        <h2 className="title">Sleep window</h2>

        {!srt ? (
          <>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: -4 }}>
              This is the engine of CBT-I. You cut time in bed down to roughly what you're actually sleeping, which
              builds sleep pressure and welds the bed back to sleep. Then you hand time back 15 minutes at a time as
              efficiency climbs. It works, and the first week feels worse before it feels better.
            </p>

            {complete7.length >= 5 ? (
              <>
                <div className="rowline">
                  <div style={{ flex: 1, fontSize: 14.5 }}>Your average sleep</div>
                  <span className="mono" style={{ fontSize: 15 }}>{durLabel(baseTST)}</span>
                </div>
                <div className="rowline">
                  <div style={{ flex: 1, fontSize: 14.5 }}>Your efficiency</div>
                  <span className="mono" style={{ fontSize: 15 }}>{Math.round(baseSE)}%</span>
                </div>
                <div style={{ marginTop: 14 }}>
                  {baseSE >= 88 ? (
                    <div className="flag">
                      Efficiency is already {Math.round(baseSE)}%. You don't have a fragmentation problem, you have
                      an opportunity problem. Restriction is the wrong tool. Go to bed earlier instead.
                    </div>
                  ) : (
                    <>
                      <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                        Starting window would be {durLabel(startWindow)} in bed, ending at {data.config.wakeGoal}.
                      </p>
                      <button className="btn" onClick={startSRT}>Start the window</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flag" style={{ marginTop: 12 }}>
                {last7.length >= 5
                  ? `You've got ${last7.length} of the last 7 nights, but only ${complete7.length} with into-bed and out-of-bed times. The window is built on efficiency, so it needs 5 complete nights.`
                  : "Log at least 5 of the last 7 nights first. The window is set from your real numbers, not a guess."}
              </div>
            )}

            <div className="warn" style={{ marginTop: 16 }}>
              Don't run this if you have bipolar disorder, epilepsy, or untreated sleep apnoea, or if you're driving
              or operating anything on limited sleep. Week one you will be more tired. That's the mechanism, but it
              matters more than usual when your job is emergency response.
            </div>
          </>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 12 }}>
              <div>
                <div className="med-num">{durLabel(srt.windowMin)}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
                  in bed, week {Math.floor(daysBetween(srt.started, today) / 7) + 1}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 15 }}>{clockLabel(toMin(srt.wakeTime) - srt.windowMin)}</div>
                <div className="mono muted" style={{ fontSize: 13, marginTop: 3 }}>to {srt.wakeTime}</div>
              </div>
            </div>

            {daysSince >= 7 ? (
              review.ready ? (
                <>
                  <div className="flag" style={{ marginBottom: 14 }}>
                    Week's efficiency: {Math.round(review.se)}%.{" "}
                    {review.verdict === "extend"
                      ? `Above 90, so you've earned 15 more minutes — window goes to ${durLabel(review.next)}.`
                      : review.verdict === "hold"
                      ? "Between 85 and 90, so hold this window another week."
                      : `Under 85, so the window tightens by 15 minutes to ${durLabel(review.next)}.`}
                  </div>
                  <button className="btn" onClick={applyReview}>Apply this week's change</button>
                </>
              ) : (
                <div className="flag">
                  Review is due but only {review.nights} of the last 7 nights are logged. Fill the gaps first.
                </div>
              )
            ) : (
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                Next review in {7 - daysSince} day{7 - daysSince === 1 ? "" : "s"}. Hold the window, keep the wake
                time fixed, and get out of bed if you're lying there awake more than about 20 minutes.
              </div>
            )}

            <div className="sect">
              <button className="btn ghost" onClick={() => save({ ...data, config: { ...data.config, srt: null } })}>
                Stop the window
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="title">Fortnightly check-in</h2>

        {!taking ? (
          <>
            {latest ? (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div>
                    <div className="med-num" style={{ color: latest.score <= 7 ? "var(--mint)" : latest.score <= 14 ? "var(--dawn)" : "var(--coral)" }}>
                      {latest.score}<span style={{ fontSize: 18, color: "var(--mute)" }}> / 28</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{band(latest.score)} · {dayLabel(latest.date)}</div>
                  </div>
                  {checkins.length > 1 && (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 44 }}>
                      {checkins.slice(-8).map((c, i) => (
                        <div key={i} style={{ width: 9, height: `${Math.max(8, (c.score / 28) * 100)}%`, background: "var(--dawn)", borderRadius: "2px 2px 0 0", opacity: .5 + i / 16 }} />
                      ))}
                    </div>
                  )}
                </div>
                {latest.score >= 15 && (
                  <div className="warn" style={{ marginTop: 10 }}>
                    Moderate or worse two check-ins running is the point where an app stops being the right tool. A
                    GP referral to a sleep psychologist for proper CBT-I beats anything self-directed.
                  </div>
                )}
              </>
            ) : (
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: -4 }}>
                Seven questions, about a minute. Repeat it every fortnight and you get a trend line instead of a
                vibe.
              </p>
            )}
            <button className="btn" style={{ marginTop: 14 }} onClick={() => { setAnswers({}); setTaking(true); }}>
              {latest ? "Take it again" : "Start the check-in"}
            </button>
          </>
        ) : (
          <>
            {ITEMS.map((it) => (
              <div key={it.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14.5, marginBottom: 9 }}>{it.q}</div>
                <div className="chips">
                  {it.scale.map((s, v) => (
                    <button key={v} className="chip" data-on={answers[it.id] === v}
                      onClick={() => setAnswers({ ...answers, [it.id]: v })}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn" disabled={!complete}
              onClick={() => { save({ ...data, checkins: [...checkins, { date: today, score: total, answers }] }); setTaking(false); }}>
              {complete ? `Save — ${total} / 28` : "Answer all seven"}
            </button>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setTaking(false)}>Cancel</button>
          </>
        )}
      </div>
    </>
  );
}
