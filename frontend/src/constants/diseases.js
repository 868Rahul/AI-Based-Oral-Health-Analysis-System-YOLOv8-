/**
 * src/constants/diseases.js
 * Disease class colours — must match COLOR_HEX in flask_api/app.py so the legend,
 * the detection chips and the boxes drawn on the annotated image all agree.
 */

export const DISEASES = [
  { key: "calculus",   name: "Calculus",   color: "#FFA500", note: "Tartar / plaque build-up" },
  { key: "cancer",     name: "Cancer",     color: "#FF0000", note: "Suspicious malignant lesion" },
  { key: "caries",     name: "Caries",     color: "#FFFF00", note: "Tooth decay / cavities" },
  { key: "gingivitis", name: "Gingivitis", color: "#FF00FF", note: "Gum inflammation" },
  { key: "ulcer",      name: "Ulcer",      color: "#00BFFF", note: "Mouth ulcer / sore" },
];

const FALLBACK = { key: "unknown", name: "Finding", color: "#00C8C8", note: "" };

/** Resolve a model label (any case / extra text) to its disease entry. */
export function getDisease(label = "") {
  const k = String(label).trim().toLowerCase();
  return DISEASES.find((d) => d.key === k)
      || DISEASES.find((d) => k.includes(d.key))
      || { ...FALLBACK, name: label || FALLBACK.name };
}

export const diseaseColor = (label) => getDisease(label).color;

/** Convert "#RRGGBB" to rgba() for translucent backgrounds. */
export function withAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
