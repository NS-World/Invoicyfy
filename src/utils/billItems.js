import { emptyItem } from "./gst";
import { isWeightUnit } from "./weight";

/** A bill line filled from a product. Loose items start without a quantity (weight is chosen next). */
export const itemFromProduct = (p) => ({
  ...emptyItem(),
  product_id: p.product_id,
  product_name: p.name,
  hsn_code: p.hsn_code || "",
  unit: p.unit || "pcs",
  unit_price: Number(p.price) || 0,
  gst_rate: Number(p.gst_rate) || 0,
  price_includes_tax: Boolean(Number(p.price_includes_tax)),
  weight_presets: p.weight_presets || null,
  quantity: isWeightUnit(p.unit) ? "" : 1,
});

/** Add one piece of a (non-loose) product: +1 on its line when it is already on the bill. */
export const addPiece = (items, p) => {
  const idx = items.findIndex((it) => it.product_id === p.product_id && !isWeightUnit(it.unit));
  if (idx >= 0) return items.map((it, i) => (i === idx ? { ...it, quantity: (Number(it.quantity) || 0) + 1 } : it));
  return [...items, itemFromProduct(p)];
};

/** Quantity of a product already on the bill (pieces, or number of loose lines). */
export const qtyOnBill = (items, productId) =>
  items.reduce((s, it) => (it.product_id === productId ? s + (isWeightUnit(it.unit) ? 1 : Number(it.quantity) || 0) : s), 0);

/** Lines that count on the bill. */
export const billLines = (items) => items.filter((i) => String(i.product_name || "").trim() && Number(i.quantity) > 0);
