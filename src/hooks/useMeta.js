import { useEffect, useState } from "react";
import { ReportServices } from "../services/ReportServices";

const FALLBACK = {
  gst_rates: [0, 0.25, 3, 5, 12, 18, 28],
  states: [],
  payment_methods: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Wallet", "Credit", "Other"],
  order_types: ["Counter", "Takeaway", "Delivery", "Dine-in", "Online", "B2B"],
  units: ["pcs", "nos", "kg", "g", "ltr", "ml", "box", "pack", "dozen"],
  expense_categories: [],
};

let cache = null;
let pending = null;

/** Lookup lists (GST rates, states, payment methods...) loaded once per session. */
export default function useMeta() {
  const [meta, setMeta] = useState(cache || FALLBACK);
  useEffect(() => {
    if (cache) return;
    pending = pending || ReportServices.meta().then((res) => (cache = { ...FALLBACK, ...res.data }));
    pending.then(setMeta).catch(() => (pending = null));
  }, []);
  return meta;
}
