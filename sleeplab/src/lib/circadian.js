/**
 * The energy curve.
 *
 * Modelled, not measured. Anchor points describe the familiar shape — sleep
 * inertia, a morning peak, the afternoon dip, an evening peak, then the fall
 * into the melatonin window — and everything between is interpolated smoothly.
 * Anchors rather than a two-process simulation because the shape is what
 * matters here and anchors can't overshoot into nonsense.
 *
 * Sleep debt does two things to it: flattens the whole curve, and deepens the
 * afternoon dip. Both are what the research describes and both are what you
 * actually feel.
 */

const ANCHORS = [
  [-1, 6], [0, 18], [1.2, 56], [2.5, 87], [4, 93], [5.5, 85],
  [7, 68], [7.9, 52], [9, 58], [10.8, 78], [12, 84], [13.4, 73],
  [15, 50], [16, 33], [17, 15], [18, 7], [20, 4],
];

const cosLerp = (a, b, t) => {
  const f = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - f) + b * f;
};

function baseEnergy(h) {
  if (h <= ANCHORS[0][0]) return ANCHORS[0][1];
  if (h >= ANCHORS[ANCHORS.length - 1][0]) return ANCHORS[ANCHORS.length - 1][1];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [x0, y0] = ANCHORS[i];
    const [x1, y1] = ANCHORS[i + 1];
    if (h >= x0 && h <= x1) return cosLerp(y0, y1, (h - x0) / (x1 - x0));
  }
  return 50;
}

/**
 * @param anchorWake  circular mean of recent wake times — your body clock
 * @param actualWake  this morning's wake — drives inertia only
 * @param debtHours   current sleep debt
 */
export function buildDay({ anchorWake, actualWake, debtHours }) {
  const d = Math.min(debtHours || 0, 12);
  const inertia = Math.min(2.6, 1.0 + d * 0.09);
  const drag = 1 - d * 0.025;

  const wakeOffset =
    actualWake == null
      ? 0
      : (() => {
          let diff = (actualWake - anchorWake) / 60;
          while (diff > 12) diff -= 24;
          while (diff < -12) diff += 24;
          return diff;
        })();

  const energyAt = (h) => {
    let e = baseEnergy(h) * drag;
    const t = h - wakeOffset;
    if (t >= 0 && t < inertia) {
      const p = t / inertia;
      e *= 0.34 + 0.66 * ((1 - Math.cos(p * Math.PI)) / 2);
    }
    if (h > 6.5 && h < 10) e -= d * 1.6 * Math.sin(((h - 6.5) / 3.5) * Math.PI);
    return Math.max(2, Math.min(100, e));
  };

  const phases = {
    inertia: [wakeOffset, wakeOffset + inertia],
    morning: [wakeOffset + inertia, 5.6],
    dip: [7.0, 9.3],
    evening: [10.6, 13.6],
    wind: [15.2, 16.4],
    melatonin: [16.4, 17.4],
  };

  return { energyAt, phases, clock: (h) => anchorWake + h * 60, inertia, wakeOffset };
}

export const PHASE_COPY = {
  inertia: { name: "Sleep inertia", note: "Grogginess. Easy jobs only." },
  morning: { name: "Morning peak", note: "Best focus of the day. Hard thinking goes here." },
  between: { name: "Steady", note: "Good general working energy." },
  dip: { name: "Afternoon dip", note: "Move, get outside. Don't paper over it with coffee." },
  evening: { name: "Evening peak", note: "Strength and power are highest. Train now." },
  wind: { name: "Wind down", note: "Lights low, screens off, cool the room." },
  melatonin: { name: "Melatonin window", note: "Lie down now and sleep comes easiest." },
  night: { name: "Night", note: "Your body expects to be asleep." },
};

export function phaseAt(h, p) {
  const inW = (w) => h >= w[0] && h < w[1];
  if (inW(p.inertia)) return "inertia";
  if (inW(p.morning)) return "morning";
  if (inW(p.dip)) return "dip";
  if (inW(p.evening)) return "evening";
  if (inW(p.wind)) return "wind";
  if (inW(p.melatonin)) return "melatonin";
  if (h >= p.melatonin[1] || h < p.inertia[0]) return "night";
  return "between";
}

export const HABITS = [
  { id: "light", label: "Outdoor light, 10 min", anchor: "wake", offset: 0.5,
    why: "Anchors your body clock and sharpens tonight's melatonin release." },
  { id: "caffeine", label: "Last coffee", anchor: "mel", offset: -10,
    why: "Caffeine has a long tail. Ten hours clear keeps sleep pressure intact." },
  { id: "train", label: "Train", anchor: "eve", offset: 0,
    why: "Evening peak is when strength and power output are highest." },
  { id: "meal", label: "Last big meal", anchor: "mel", offset: -3,
    why: "Core temperature has to fall for sleep to start. Digesting keeps it up." },
  { id: "dim", label: "Screens down, lights low", anchor: "wind", offset: 0,
    why: "Bright light after dusk can push melatonin back by up to 90 minutes." },
  { id: "bed", label: "Lie down", anchor: "mel", offset: 0,
    why: "The hour where falling asleep takes the least effort." },
];
