import { useEffect, useState } from "react";
import { SaasServices } from "../services/SaasServices";

/** Is this Khanak running as SaaS (shop codes, plans)? Asked once per page load; a single-shop install answers "no". */
let cached = null;
let pending = null;
export const loadSaasConfig = () => {
  if (cached) return Promise.resolve(cached);
  pending =
    pending ||
    SaasServices.config()
      .then((r) => (cached = { saas: true, ...(r.data || {}) }))
      .catch(() => (cached = { saas: false }));
  return pending;
};

export default function useSaasConfig() {
  const [cfg, setCfg] = useState(cached);
  useEffect(() => {
    let live = true;
    loadSaasConfig().then((c) => live && setCfg(c));
    return () => {
      live = false;
    };
  }, []);
  return cfg; // null while loading
}
