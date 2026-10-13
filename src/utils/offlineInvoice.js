import { calcLine } from "./gst";
import { localDateTime, provisionalNumber } from "./offline";

/** Invoice-shaped object for printing an offline bill on the thermal receipt / KOT before it reaches the server. */
export function buildOfflineInvoice({ uuid, store, items, totals, interstate, party, orderType, tableNo, payments, user, notes }) {
  const now = localDateTime();
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const lines = items.map((it, i) => {
    const l = calcLine(it, interstate);
    return {
      key: it.key || i,
      product_name: it.product_name,
      hsn_code: it.hsn_code,
      unit: it.unit,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_amount: Number(it.discount_amount) || 0,
      gst_rate: Number(it.gst_rate) || 0,
      price_includes_tax: it.price_includes_tax ? 1 : 0,
      item_note: it.item_note || null,
      taxable_value: l.taxable,
      tax_amount: l.tax,
      line_total: l.total,
    };
  });
  return {
    invoice_number: provisionalNumber(uuid),
    invoice_type: "retail",
    invoice_date: now.slice(0, 10),
    created_at: now,
    store,
    items: lines,
    order_type: orderType,
    table_no: tableNo || null,
    customer_name: party.customer?.name || party.customer_name || null,
    customer_phone: party.customer?.phone || party.customer_phone || null,
    user_name: user?.name,
    subtotal: totals.subtotal,
    discount_amount: totals.discount,
    taxable_amount: totals.taxable,
    cgst_amount: totals.cgst,
    sgst_amount: totals.sgst,
    igst_amount: totals.igst,
    tax_amount: totals.tax,
    round_off: totals.roundOff,
    total_amount: totals.total,
    total_qty: totals.qty,
    is_interstate: interstate ? 1 : 0,
    amount_paid: paid,
    balance_due: Math.max(0, Math.round((totals.total - paid) * 100) / 100),
    status: paid >= totals.total - 0.009 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
    payments: payments.map((p) => ({ payment_method: p.payment_method, amount: Number(p.amount) })),
    notes: notes || null,
    offline: true,
  };
}
