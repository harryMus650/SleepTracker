import React, { useRef } from "react";
import { clockLabel } from "../lib/time.js";

const W = 340, H = 150, PAD = 6, H0 = -0.5, H1 = 19.5;

/* The sky is the day's own light: dawn at wake, blue through the middle,
   gold at the evening peak, violet through the melatonin window, then night. */
const STOPS = [
  [-0.5, "#0B1026"], [0, "#F2915C"], [1.5, "#FFD79A"], [4, "#D6E7FF"], [8, "#A9BAEA"],
  [11.5, "#FFC46B"], [15, "#C58AD8"], [16.4, "#8570DE"], [17.6, "#3B2E7E"], [19.5, "#0B1026"],
];

export default function SkyBand({ day, nowH, scrub, setScrub }) {
  const ref = useRef(null);

  const x = (h) => PAD + ((h - H0) / (H1 - H0)) * (W - PAD * 2);
  const y = (e) => H - PAD - (e / 100) * (H - PAD * 2 - 14);

  const pts = [];
  for (let h = H0; h <= H1 + 0.001; h += 0.25) pts.push([x(h), y(day.energyAt(h))]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${x(H1)},${H - PAD} L${x(H0)},${H - PAD} Z`;

  const pick = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return H0 + frac * (H1 - H0);
  };

  const showH = scrub != null ? scrub : nowH;
  const inRange = showH >= H0 && showH <= H1;

  return (
    <svg
      ref={ref}
      className="band"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Energy through the day. Currently ${Math.round(day.energyAt(nowH))} out of 100.`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setScrub(pick(e.clientX)); }}
      onPointerMove={(e) => { if (e.buttons) setScrub(pick(e.clientX)); }}
    >
      <defs>
        <linearGradient id="sky" x1="0" x2="1">
          {STOPS.map(([h, c]) => (
            <stop key={h} offset={`${(((h - H0) / (H1 - H0)) * 100).toFixed(1)}%`} stopColor={c} />
          ))}
        </linearGradient>
        <clipPath id="clipBand">
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} rx="10" />
        </clipPath>
      </defs>

      <g clipPath="url(#clipBand)">
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="url(#sky)" opacity=".92" />
        <path d={area} fill="rgba(255,255,255,0.20)" />
        <path d={line} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="2" strokeLinejoin="round" />
        {inRange && (
          <>
            <line x1={x(showH)} y1={PAD} x2={x(showH)} y2={H - PAD} stroke="rgba(11,16,38,.75)" strokeWidth="1.5" />
            <circle cx={x(showH)} cy={y(day.energyAt(showH))} r="5.5" fill="#0B1026" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </g>

      {[0, 4, 8, 12, 16, 19].map((h) => (
        <text key={h} x={x(h)} y={H - 1} fill="#8790C0" fontSize="8.5" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">
          {clockLabel(day.clock(h))}
        </text>
      ))}
    </svg>
  );
}
