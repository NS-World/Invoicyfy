/**
 * Client-side GST preview. Mirrors Invoicyfy-Backend/lib/gst.php so totals shown while typing
 * match what the server saves. The server always recalculates; this is only for display.
 */
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const calcLine = (item, interstate) => {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const rate = Number(item.gst_rate) || 0;
  const discount = Math.min(Number(item.discount_amount) || 0, qty * price);
  const gross = r2(qty * price);
  const net = r2(gross - discount);
  let taxable;
  let tax;
  if (item.price_includes_tax) {
    taxable = r2((net * 100) / (100 + rate));
    tax = r2(net - taxable);
  } else {
    taxable = net;
    tax = r2((taxable * rate) / 100);
  }
  const cgst = interstate ? 0 : r2(tax / 2);
  return {
    gross,
    taxable,
    tax,
    cgst,
    sgst: interstate ? 0 : r2(tax - cgst),
    igst: interstate ? tax : 0,
    total: r2(taxable + tax),
  };
};

export const calcTotals = (items, interstate, roundOff = true) => {
  const t = { subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, qty: 0 };
  items.forEach((it) => {
    const l = calcLine(it, interstate);
    t.subtotal += l.gross;
    t.discount += Math.min(Number(it.discount_amount) || 0, l.gross);
    t.taxable += l.taxable;
    t.cgst += l.cgst;
    t.sgst += l.sgst;
    t.igst += l.igst;
    t.tax += l.tax;
    t.qty += Number(it.quantity) || 0;
  });
  Object.keys(t).forEach((k) => (t[k] = r2(t[k])));
  const exact = r2(t.taxable + t.tax);
  const total = roundOff ? Math.round(exact) : exact;
  return { ...t, count: items.length, roundOff: r2(total - exact), total: r2(total) };
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const emptyItem = () => ({
  key: `${Date.now()}-${Math.random()}`,
  product_id: null,
  product_name: "",
  hsn_code: "",
  unit: "pcs",
  quantity: 1,
  unit_price: 0,
  discount_amount: 0,
  gst_rate: 0,
  price_includes_tax: false,
  item_note: "",
  weight_presets: null,
  qty_entry: "g", // for weight items: type the quantity in grams or kg
});

/** Turn an API item (order/invoice) into editor state. */
export const itemFromApi = (it) => ({
  ...emptyItem(),
  product_id: it.product_id ?? null,
  product_name: it.product_name || "",
  hsn_code: it.hsn_code || "",
  unit: it.unit || "pcs",
  quantity: Number(it.quantity) || 1,
  unit_price: Number(it.unit_price) || 0,
  discount_amount: Number(it.discount_amount) || 0,
  gst_rate: Number(it.gst_rate) || 0,
  price_includes_tax: Boolean(Number(it.price_includes_tax)),
  item_note: it.item_note || "",
});

export const itemToApi = (it) => ({
  product_id: it.product_id || null,
  product_name: it.product_name,
  hsn_code: it.hsn_code || null,
  unit: it.unit || null,
  quantity: Number(it.quantity),
  unit_price: Number(it.unit_price),
  discount_amount: Number(it.discount_amount) || 0,
  gst_rate: Number(it.gst_rate) || 0,
  price_includes_tax: Boolean(it.price_includes_tax),
  item_note: it.item_note || null,
});
