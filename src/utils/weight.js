/** Helpers for items sold by weight (price per kg, billed in grams). */
const FACTOR = { kg: 1000, kgs: 1000, kilogram: 1000, g: 1, gm: 1, gms: 1, gram: 1, grams: 1 };

export const DEFAULT_WEIGHT_PRESETS = [100, 250, 500, 750, 1000];

export const isWeightUnit = (unit) => Boolean(FACTOR[String(unit || "").toLowerCase()]);

/** grams in one unit of the product (kg = 1000, g = 1) */
export const gramsPerUnit = (unit) => FACTOR[String(unit || "").toLowerCase()] || 1;

export const parsePresets = (value) => {
  const list = String(value || "")
    .split(",")
    .map((v) => Math.round(Number(v)))
    .filter((v) => v > 0);
  return list.length ? [...new Set(list)].sort((a, b) => a - b) : DEFAULT_WEIGHT_PRESETS;
};

export const gramsLabel = (g) => (g >= 1000 ? `${Number((g / 1000).toFixed(3))} kg` : `${Math.round(g * 100) / 100} g`);

const trim = (n, d = 3) => String(Number(Number(n).toFixed(d)));

/** 0.25 kg -> "250 g", 1.5 kg -> "1.5 kg", 3 pcs -> "3 pcs" */
export const formatQty = (qty, unit, { withUnit = true } = {}) => {
  const q = Number(qty) || 0;
  if (isWeightUnit(unit)) return gramsLabel(q * gramsPerUnit(unit));
  return withUnit && unit ? `${trim(q)} ${unit}` : trim(q);
};

/** "₹400/kg" style rate suffix */
export const rateSuffix = (unit) => (isWeightUnit(unit) ? `/${String(unit).toLowerCase().startsWith("k") ? "kg" : "g"}` : "");
