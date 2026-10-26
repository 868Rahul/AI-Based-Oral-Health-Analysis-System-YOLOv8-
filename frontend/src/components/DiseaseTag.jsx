/**
 * src/components/DiseaseTag.jsx
 * Colour-coded disease chip and the 5-colour legend.
 */

import React from "react";
import { DISEASES, getDisease, withAlpha } from "../constants/diseases";

export function DiseaseTag({ label, confidence }) {
  const d = getDisease(label);
  return (
    <span
      className="disease-tag"
      style={{ color: d.color, background: withAlpha(d.color, 0.14), borderColor: withAlpha(d.color, 0.55) }}
    >
      <span className="disease-dot" style={{ background: d.color }} />
      {d.name}
      {confidence !== undefined && <strong>{(confidence * 100).toFixed(1)}%</strong>}
    </span>
  );
}

/** `active` (optional) is a list of labels found in the current result — others are dimmed. */
export function DiseaseLegend({ active }) {
  const found = active ? new Set(active.map((l) => getDisease(l).key)) : null;
  return (
    <div className="legend">
      {DISEASES.map((d) => (
        <div
          key={d.key}
          className="legend-item"
          title={d.note}
          style={{ opacity: found && !found.has(d.key) ? 0.4 : 1, borderColor: found?.has(d.key) ? d.color : undefined }}
        >
          <span className="legend-swatch" style={{ background: d.color }} />
          {d.name}
        </div>
      ))}
    </div>
  );
}
