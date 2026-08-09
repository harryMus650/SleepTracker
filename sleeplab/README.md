# Sleep Lab

Sleep debt, a circadian schedule, and a sleep window that adapts. Installable, works offline, data never leaves the device.

## Running it

```bash
npm install
npm run dev
```

`vite.config.js` sets `host: true`, so the dev server prints a network URL as well as localhost. Open that one on your phone (same wifi) and you can test it where you'll actually use it.

```bash
npm run build     # -> dist/
npm run preview   # serve the built version
```

## Getting it on your phone

The app is a PWA. Deploy `dist/` anywhere with HTTPS — Netlify drop, Vercel, GitHub Pages, Cloudflare Pages. HTTPS is not optional: service workers and notifications both refuse to run without it, so `file://` or plain HTTP won't work.

Then: **iPhone** — open in Safari, Share, Add to Home Screen. **Android** — Chrome will offer Install.

## Architecture

```
src/
  lib/
    time.js        date and clock helpers, circular mean of wake times
    diary.js       derive(), sleep debt, SRI, sleep window review, correlations
    circadian.js   energy curve, phase windows, habit definitions
    store.js       versioned storage, migrations, backups, import/export
    notify.js      local reminder scheduling
  components/      SkyBand, Stat
  views/           Today, Log, Trends, Plan, Setup
  App.jsx          state, derived values, tab routing
```

The maths lives in `lib/` as pure functions with no React in sight. That's deliberate — it means the engine can be tested in plain node, and it can be lifted into another app without dragging UI along.

## The data model

One record per night, keyed by the morning you woke up (`"2026-08-08"`):

```js
{
  inBed, lightsOut, finalWake, outOfBed,   // "HH:MM"
  sol, waso, awakenings, napMin,           // minutes / counts
  quality, rested,                         // 1-5
  shift,                                   // off | early | day | late | night
  caffeineLast, alcohol, trained, screens, lightAm,
  rhr, hrv, notes,
  habits: { light: true, ... }
}
```

Everything else is derived, never stored. `derive()` is the single place a night becomes numbers.

## Storage and migrations

Keys are namespaced `sleep:` so this can share an origin with other trackers without collisions. `sleep:data` holds everything; `sleep:backups` keeps a rolling eight daily snapshots.

**When you change the shape of an entry, add a migration.** `store.js` has a `SCHEMA` number and a `MIGRATIONS` map keyed by the version being upgraded *from*. Bump the number, add the function. Old data then survives indefinitely, including the v1 shape from the first version of this tracker.

This is not ceremony. The predecessor of this app lost data on every upgrade because there was nowhere for the old shape to go.

## What the numbers mean

- **Sleep debt** — weighted 14-night shortfall against your sleep need. Last night carries 15% of the weight, the 13 before share 85% with recency bias. Normalised so an even shortfall returns the plain sum of hours missed.
- **Efficiency (SE)** — asleep ÷ time in bed. Under 85% is the clinical threshold. Deliberately `null` when bed times are missing rather than estimated.
- **Regularity (SRI)** — probability that any two moments 24h apart find you in the same state, −100 to 100. Five-minute epochs. Above 80 is the target.
- **Energy** — modelled from anchor points, not measured. Debt flattens the curve and deepens the afternoon dip.
- **Sleep window** — sleep restriction therapy. 90%+ efficiency earns 15 min back, 85–90% holds, under 85% gives 15 min up, floor of five hours.

## Testing

The engine is plain ESM, so it runs directly:

```bash
node --input-type=module -e "
const { derive } = await import('./src/lib/diary.js');
console.log(derive({ lightsOut:'23:00', finalWake:'06:30', sol:15, waso:20, inBed:'22:45', outOfBed:'06:45' }));
"
```

## Limits worth knowing

Reminders are local timers, not push. Reliable on Android and desktop when installed; on iOS they need the app on the home screen and opened that day. A phone alarm is more dependable and the Setup tab says so.

No account, no sync, no cloud. Clearing site data wipes it. Export regularly.

Not a medical device. It cannot detect apnoea.
