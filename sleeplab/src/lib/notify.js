/**
 * Reminders.
 *
 * Read this before trusting it. There is no push server here, so these are
 * local timers. What that means in practice:
 *
 *   Android / desktop, installed  — reliable. The service worker keeps the
 *                                   timer alive well enough for a same-day nudge.
 *   iOS, installed to home screen — works on iOS 16.4+, but only while the app
 *                                   has been opened that day. iOS aggressively
 *                                   suspends background timers.
 *   Any browser tab, not installed — fires only while the tab is alive.
 *
 * So: install it, and open it once in the evening. If you want a nudge that
 * fires no matter what, a phone alarm or a Shortcuts automation at your
 * wind-down time is more dependable than any web app, and the Setup tab says so.
 */

const timers = [];

export function supported() {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator;
}

export function permission() {
  return supported() ? Notification.permission : "unsupported";
}

export async function requestPermission() {
  if (!supported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return "denied";
  }
}

async function fire(title, body) {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "sleep-lab",
      renotify: true,
      silent: false,
    });
  } catch (e) {
    try { new Notification(title, { body }); } catch (_) { /* nothing we can do */ }
  }
}

export function clearAll() {
  while (timers.length) clearTimeout(timers.pop());
}

/**
 * Schedule tonight's two nudges from the circadian model.
 * @param day  the object returned by buildDay()
 */
export function scheduleTonight(day, { enabled }) {
  clearAll();
  if (!enabled || permission() !== "granted") return 0;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const at = (h, title, body) => {
    let target = ((Math.round(day.clock(h)) % 1440) + 1440) % 1440;
    let delta = target - nowMin;
    if (delta < 1) return false;          // already passed today, leave it
    if (delta > 20 * 60) return false;    // too far out to trust a timer
    timers.push(setTimeout(() => fire(title, body), delta * 60 * 1000));
    return true;
  };

  let n = 0;
  if (at(day.phases.wind[0], "Wind down", "Lights low, screens off. Melatonin window opens in about an hour."))
    n++;
  if (at(day.phases.melatonin[0], "Melatonin window", "This is the easiest hour to fall asleep. Go now."))
    n++;
  return n;
}
