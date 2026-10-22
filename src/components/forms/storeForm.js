import { GSTIN_REGEX } from "../../utils/gst";

export const blankStore = {
  name: "",
  legal_name: "",
  tagline: "",
  address: "",
  city: "",
  state_code: "",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  fssai_no: "",
  logo_url: "",
  invoice_prefix: "INV",
  bill_prefix: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  bank_branch: "",
  upi_id: "",
  invoice_terms: "",
  receipt_footer: "Thanks",
  logo: null,
};

// A saved store keeps what was saved: a field left empty stays empty (defaults are only for a new store).
export const storeFromApi = (d) =>
  Object.fromEntries(Object.keys(blankStore).map((k) => [k, d ? (d[k] ?? (k === "invoice_prefix" ? "INV" : k === "logo" ? null : "")) : blankStore[k]]));

export const storeInvalid = (f) => Boolean(f.gstin && !GSTIN_REGEX.test(f.gstin));
