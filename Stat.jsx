import React from "react";

export default function Stat({ label, value, sub }) {
  return (
    <div className="rowline">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15 }}>{label}</div>
        {sub ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div> : null}
      </div>
      <span className="mono" style={{ fontSize: 16 }}>{value}</span>
    </div>
  );
}
