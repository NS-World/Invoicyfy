import { PlanServices } from "../../services/SaasServices";

/** The shop's plan (SaaS only), shared by the banner and the Plan & billing page; refreshed after a payment. */
let cached = null;
let pending = null;
const listeners = new Set();
export const loadPlanStatus = (force = false) => {
  if (cached && !force) return Promise.resolve(cached);
  if (!pending || force) {
    pending = PlanServices.status()
      .then((r) => (cached = r.data))
      .catch(() => (cached = null))
      .finally(() => {
        pending = null;
        listeners.forEach((f) => f(cached));
      });
  }
  return pending;
};
export const onPlanStatus = (f) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
