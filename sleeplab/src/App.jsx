import React, { useState, useEffect, useMemo, useCallback } from "react";
import Today from "./views/Today.jsx";
import Log from "./views/Log.jsx";
import Trends from "./views/Trends.jsx";
import Plan from "./views/Plan.jsx";
import Setup from "./views/Setup.jsx";
import { derive, debtAt, computeSRI } from "./lib/diary.js";
import { buildDay } from "./lib/circadian.js";
import { dateKey, shiftKey, toMin, meanTime } from "./lib/time.js";
import * as store from "./lib/store.js";
import * as notify from "./lib/notify.js";

const TABS = [
  ["today", "Today"],
  ["log", "Log"],
  ["trends", "Trends"],
  ["plan", "Plan"],
  ["setup", "Setup"],
];

export default function App() {
  const [data, setData] = useState(() => store.load());
  const [tab, setTab] = useState("today");
  const [now, setNow] = useState(new Date());
  const [scrub, setScrub] = useState(null);

  // one daily snapshot, taken on open
  useEffect(() => { store.snapshot(data); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const save = useCallback((next) => {
    setData(next);
    store.save(next);
  }, []);

  const today = dateKey(now);
  const need = data.config.sleepNeed;
  const entries = data.entries;

  const recent = useMemo(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const k = shiftKey(today, -i);
      out.push({ key: k, entry: entries[k], d: derive(entries[k]) });
    }
    return out;
  }, [entries, today]);

  const debt = useMemo(() => debtAt(entries, need, today), [entries, need, today]);
  const sri = useMemo(() => computeSRI(entries, today), [entries, today]);

  // Circadian phase anchors to your average wake time, not this morning's, so
  // one early shift doesn't yank the whole schedule around.
  const anchorWake = useMemo(() => {
    const times = recent.slice(0, 7).map((r) => r.d?.fw).filter((v) => v != null);
    return times.length ? meanTime(times) : toMin(data.config.wakeGoal);
  }, [recent, data.config.wakeGoal]);

  const day = useMemo(
    () => buildDay({
      anchorWake,
      actualWake: derive(entries[today])?.fw ?? null,
      debtHours: debt == null ? 0 : debt / 60,
    }),
    [anchorWake, entries, today, debt]
  );

  const nowH = useMemo(() => {
    let h = (now.getHours() * 60 + now.getMinutes() - anchorWake) / 60;
    while (h < -2) h += 24;
    while (h > 22) h -= 24;
    return h;
  }, [now, anchorWake]);

  // Re-arm tonight's nudges whenever the schedule shifts.
  useEffect(() => {
    notify.scheduleTonight(day, { enabled: !!data.config.reminders });
    return () => notify.clearAll();
  }, [day, data.config.reminders]);

  const setEntry = useCallback(
    (key, patch) => save({ ...data, entries: { ...data.entries, [key]: { ...(data.entries[key] || {}), ...patch } } }),
    [data, save]
  );

  const shared = { data, save, config: data.config, entries, today, need, recent, debt, sri, day, nowH, now, setEntry };

  return (
    <div className="app">
      <main className="wrap">
        {tab === "today" && <Today {...shared} scrub={scrub} setScrub={setScrub} goLog={() => setTab("log")} />}
        {tab === "log" && <Log {...shared} />}
        {tab === "trends" && <Trends {...shared} />}
        {tab === "plan" && <Plan {...shared} />}
        {tab === "setup" && <Setup {...shared} />}
      </main>

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} data-on={tab === id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
