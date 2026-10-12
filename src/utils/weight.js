/**
 * Helpers for loose items sold by measure: weight (price per kg, billed in grams) or volume (price per litre,
 * billed in ml). Quantities are always stored in the product's own unit (0.25 kg, 0.5 l, 250 g...).
 */
const UNITS = {
  kg: [1000, "w"], kgs: [1000, "w"], kilogram: [1000, "w"], g: [1, "w"], gm: [1, "w"], gms: [1, "w"], gram: [1, "w"], grams: [1, "w"],
  l: [1000, "v"], ltr: [1000, "v"], litre: [1000, "v"], liter: [1000, "v"], ml: [1, "v"],
};
const info = (unit) => UNITS[String(unit || "").trim().toLowerCase()];

export const DEFAULT_WEIGHT_PRESETS = [100, 250, 500, 750, 1000];

/** Sold by weight or volume (kg, g, l, ml) */
export const isWeightUnit = (unit) => Boolean(info(unit));
export const isVolumeUnit = (unit) => info(unit)?.[1] === "v";

/** Base units (grams or ml) in one unit of the product (kg = 1000, g = 1, l = 1000) */
export const gramsPerUnit = (unit) => info(unit)?.[0] || 1;

/** Names of the small and big unit: ["g", "kg"] or ["ml", "L"] */
export const measureUnits = (unit) => (isVolumeUnit(unit) ? ["ml", "L"] : ["g", "kg"]);

export const parsePresets = (value) => {
  const list = String(value || "")
    .split(",")
    .map((v) => Math.round(Number(v)))
    .filter((v) => v > 0);
  return list.length ? [...new Set(list)].sort((a, b) => a - b) : DEFAULT_WEIGHT_PRESETS;
};

/** 250 -> "250 g", 1500 -> "1.5 kg" (or ml / L for volume units) */
export const gramsLabel = (g, unit) => {
  const [small, big] = measureUnits(unit);
  return g >= 1000 ? `${Number((g / 1000).toFixed(3))} ${big}` : `${Math.round(g * 100) / 100} ${small}`;
};

const trim = (n, d = 3) => String(Number(Number(n).toFixed(d)));

/** 0.25 kg -> "250 g", 1.5 kg -> "1.5 kg", 3 pcs -> "3 pcs" */
export const formatQty = (qty, unit, { withUnit = true } = {}) => {
  const q = Number(qty) || 0;
  if (isWeightUnit(unit)) return gramsLabel(q * gramsPerUnit(unit), unit);
  return withUnit && unit ? `${trim(q)} ${unit}` : trim(q);
};

/** "₹400/kg" style rate suffix */
export const rateSuffix = (unit) => {
  const i = info(unit);
  if (!i) return "";
  const [small, big] = measureUnits(unit);
  return `/${i[0] === 1 ? small : big}`;
};
