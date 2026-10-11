/** Invoice designer settings saved per store (stores.invoice_settings). Defaults = the original design. */
export const DEFAULT_INVOICE_SETTINGS = {
  a4_template: "classic",
  receipt_template: "classic",
  accent_color: "#045864",
  show_logo: true,
  show_status: true,
  show_hsn_column: true,
  show_discount_column: true,
  show_hsn_summary: true,
  show_amount_in_words: true,
  show_bank: true,
  show_upi_qr: true,
  show_terms: true,
  show_signature: true,
  show_customer_phone: true,
  show_fssai: true,
  show_item_notes: true,
  show_cashier: true,
  show_payment_mode: true,
  show_gstin_on_receipt: true,
  show_tax_on_receipt: true,
  show_address_on_receipt: true,
  title_tax: "TAX INVOICE",
  title_retail: "INVOICE",
  header_note: "",
  footer_note: "This is a computer generated invoice.",
  signature_label: "Authorised Signatory",
  receipt_header_note: "",
  receipt_footer_note: "",
  qr_codes: [],
};

export const A4_TEMPLATES = [
  { key: "classic", name: "Classic", description: "Bordered GST layout (current default)" },
  { key: "modern", name: "Modern", description: "Colour header band and table" },
  { key: "minimal", name: "Minimal", description: "Clean lines, lots of white space" },
  { key: "bold", name: "Bold", description: "Large title, striped rows" },
];

export const RECEIPT_TEMPLATES = [
  { key: "classic", name: "Classic", description: "Your current shop bill (default)" },
  { key: "compact", name: "Compact", description: "Smaller text, saves paper (good for 58 mm)" },
  { key: "detailed", name: "Detailed", description: "GST % and HSN on every item, tax breakup" },
];

export const ACCENT_COLORS = ["#045864", "#1a1d21", "#1565c0", "#6a1b9a", "#c62828", "#ef6c00", "#2e7d32", "#ad1457"];

export const getInvoiceSettings = (store) => {
  let saved = {};
  try {
    saved = typeof store?.invoice_settings === "string" ? JSON.parse(store.invoice_settings || "{}") : store?.invoice_settings || {};
  } catch {
    saved = {};
  }
  return { ...DEFAULT_INVOICE_SETTINGS, ...saved, qr_codes: Array.isArray(saved?.qr_codes) ? saved.qr_codes : [] };
};

/** QR codes that should print on this format ("a4" or "receipt"). */
export const qrCodesFor = (settings, format) => (settings.qr_codes || []).filter((q) => (q.url || q.image) && (q.show_on === "both" || q.show_on === format || !q.show_on));
