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
  // Layout (null = template default)
  show_store_name: true,
  receipt_show_price_col: true,
  receipt_bold_items: false,
  receipt_separator: "solid",
  receipt_font_size: null,
  receipt_padding: null,
  receipt_line_height: null,
  receipt_store_name_size: null,
  receipt_col_qty: null,
  receipt_col_price: null,
  receipt_col_amount: null,
  receipt_logo_width: null,
  a4_font_size: null,
  a4_padding: null,
  a4_cell_padding: null,
  a4_title_size: null,
  a4_logo_height: null,
  custom_blocks: [],
};

/** Where a custom text block can be printed. */
export const BLOCK_POSITIONS = [
  { key: "top", label: "Very top" },
  { key: "after_header", label: "Under shop details" },
  { key: "before_items", label: "Before items" },
  { key: "after_items", label: "After items" },
  { key: "after_totals", label: "After totals" },
  { key: "bottom", label: "Bottom (before QR codes)" },
];

const set = (v) => v !== null && v !== undefined && v !== "";

/** Inline style for the receipt root from the layout settings (only values the shop changed). */
export const receiptStyle = (s) => {
  const st = {};
  if (set(s.receipt_font_size)) st.fontSize = `${s.receipt_font_size}px`;
  if (set(s.receipt_padding)) st.padding = `${s.receipt_padding}mm ${s.receipt_padding}mm ${Number(s.receipt_padding) + 3}mm`;
  if (set(s.receipt_line_height)) st.lineHeight = s.receipt_line_height;
  if (set(s.receipt_store_name_size)) st["--store-size"] = `${s.receipt_store_name_size}em`;
  if (set(s.receipt_col_qty)) st["--qty-w"] = `${s.receipt_col_qty}ch`;
  if (set(s.receipt_col_price)) st["--price-w"] = `${s.receipt_col_price}ch`;
  if (set(s.receipt_col_amount)) st["--amt-w"] = `${s.receipt_col_amount}ch`;
  if (set(s.receipt_logo_width)) st["--logo-w"] = `${s.receipt_logo_width}mm`;
  return st;
};

export const a4Style = (s) => {
  const st = { "--accent": s.accent_color || "#045864" };
  if (set(s.a4_font_size)) st.fontSize = `${s.a4_font_size}px`;
  if (set(s.a4_padding)) st.padding = `${s.a4_padding}mm`;
  if (set(s.a4_cell_padding)) st["--cell-pad"] = `${s.a4_cell_padding}px`;
  if (set(s.a4_title_size)) st["--title-size"] = `${s.a4_title_size}px`;
  if (set(s.a4_logo_height)) st["--a4-logo-h"] = `${s.a4_logo_height}px`;
  return st;
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
  return {
    ...DEFAULT_INVOICE_SETTINGS,
    ...saved,
    qr_codes: Array.isArray(saved?.qr_codes) ? saved.qr_codes : [],
    custom_blocks: Array.isArray(saved?.custom_blocks) ? saved.custom_blocks : [],
  };
};

/** QR codes that should print on this format ("a4" or "receipt"). */
export const qrCodesFor = (settings, format) => (settings.qr_codes || []).filter((q) => (q.url || q.image) && (q.show_on === "both" || q.show_on === format || !q.show_on));
