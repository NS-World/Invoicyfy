/** A realistic invoice used to preview designs before the shop has billed anything. */
export const sampleInvoice = (store, type = "tax") => {
  const items =
    type === "tax"
      ? [
          { invoice_item_id: 1, product_name: "Ice Cream Tub 4L (Bulk)", hsn_code: "2105", unit: "pcs", quantity: 4, unit_price: 900, discount_amount: 180, taxable_value: 3420, gst_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, cgst_amount: 307.8, sgst_amount: 307.8, igst_amount: 0, tax_amount: 615.6, line_total: 4035.6, price_includes_tax: 0, item_note: "Kesar & Vanilla mix" },
          { invoice_item_id: 2, product_name: "Party Cups (pack of 50)", hsn_code: "4823", unit: "pack", quantity: 2, unit_price: 120, discount_amount: 0, taxable_value: 240, gst_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, cgst_amount: 21.6, sgst_amount: 21.6, igst_amount: 0, tax_amount: 43.2, line_total: 283.2, price_includes_tax: 0 },
        ]
      : [
          { invoice_item_id: 1, product_name: "Roasted Dryfruit", hsn_code: "2105", unit: "pcs", quantity: 1, unit_price: 230, discount_amount: 0, taxable_value: 194.92, gst_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, cgst_amount: 17.54, sgst_amount: 17.54, igst_amount: 0, tax_amount: 35.08, line_total: 230, price_includes_tax: 1, item_note: "Dry Fruits: Pista - 1x50 = 50" },
          { invoice_item_id: 2, product_name: "Loose Vanilla Ice Cream", hsn_code: "2105", unit: "kg", quantity: 0.25, unit_price: 400, discount_amount: 0, taxable_value: 84.75, gst_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, cgst_amount: 7.63, sgst_amount: 7.62, igst_amount: 0, tax_amount: 15.25, line_total: 100, price_includes_tax: 1 },
        ];
  const sum = (k) => Math.round(items.reduce((s, i) => s + Number(i[k]), 0) * 100) / 100;
  const total = Math.round(sum("taxable_value") + sum("tax_amount"));
  return {
    invoice_id: 0,
    invoice_number: type === "tax" ? `${store?.invoice_prefix || "INV"}/26-27/0012` : "55",
    invoice_type: type,
    invoice_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    due_date: type === "tax" ? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10) : null,
    customer_name: type === "tax" ? "Royal Caterers" : "Ravi",
    customer_phone: "9723423345",
    customer_gstin: type === "tax" ? "24AAKFR1234C1Z9" : null,
    billing_address: type === "tax" ? "Plot 12, Industrial Area, Surat, Gujarat - 395003" : null,
    place_of_supply: store?.state || "Gujarat",
    place_of_supply_code: store?.state_code || "24",
    is_interstate: 0,
    order_type: type === "tax" ? "B2B" : "Delivery",
    user_name: "biller",
    subtotal: sum("taxable_value") + (type === "tax" ? 180 : sum("tax_amount")),
    discount_amount: sum("discount_amount"),
    taxable_amount: sum("taxable_value"),
    cgst_amount: sum("cgst_amount"),
    sgst_amount: sum("sgst_amount"),
    igst_amount: 0,
    tax_amount: sum("tax_amount"),
    round_off: Math.round((total - sum("taxable_value") - sum("tax_amount")) * 100) / 100,
    total_amount: total,
    amount_paid: type === "tax" ? 0 : total,
    balance_due: type === "tax" ? total : 0,
    status: type === "tax" ? "Unpaid" : "Paid",
    terms: store?.invoice_terms || "1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.",
    payments: type === "tax" ? [] : [{ payment_method: "UPI" }],
    items,
    total_qty: items.reduce((s, i) => s + i.quantity, 0),
    hsn_summary: [
      { hsn_code: "2105", gst_rate: 18, taxable_value: items[0].taxable_value, cgst_amount: items[0].cgst_amount, sgst_amount: items[0].sgst_amount, igst_amount: 0, tax_amount: items[0].tax_amount },
      { hsn_code: items[1].hsn_code, gst_rate: 18, taxable_value: items[1].taxable_value, cgst_amount: items[1].cgst_amount, sgst_amount: items[1].sgst_amount, igst_amount: 0, tax_amount: items[1].tax_amount },
    ],
    store,
  };
};
