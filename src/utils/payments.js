/** Split payment rows -> amounts. The first row follows the bill total (minus the other rows) until it is typed in. */
export const paymentAmounts = (rows, total) => {
  const others = rows.slice(1).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return rows.map((r, i) => (i === 0 && r.amount === "" ? Math.max(0, Math.round((total - others) * 100) / 100) : Number(r.amount) || 0));
};

export const upiLink = ({ upi_id, payee_name }, amount, note) =>
  `upi://pay?pa=${encodeURIComponent(upi_id)}&pn=${encodeURIComponent(payee_name || "Shop")}&am=${Number(amount).toFixed(2)}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}`;

/** Server bill totals -> the shape TotalsSummary shows. */
export const fromServerTotals = (t, count) => ({
  count,
  subtotal: t.subtotal,
  discount: t.discount_amount,
  taxable: t.taxable_amount,
  cgst: t.cgst_amount,
  sgst: t.sgst_amount,
  igst: t.igst_amount,
  roundOff: t.round_off,
  total: t.total_amount,
});

export const newUuid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).slice(0, 40);
