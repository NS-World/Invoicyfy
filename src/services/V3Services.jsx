import API, { qs } from "./axios";

/** Day close / cash register */
export const CashServices = {
  current: async (store_id) => (await API.get(`/master/cash/current.php${qs({ store_id })}`)).data,
  open: async (data) => (await API.post("/master/cash/create-session.php", data)).data,
  movement: async (data) => (await API.post("/master/cash/add-movement.php", data)).data,
  close: async (data) => (await API.post("/master/cash/close-session.php", data)).data,
  list: async (page, size, extra = {}) => (await API.get(`/master/cash/sessions.php${qs({ page: page + 1, limit: size, ...extra })}`)).data,
  get: async (session_id) => (await API.get(`/master/cash/get-session.php${qs({ session_id })}`)).data,
};

/** Counter settings (tables, day-open rule, UPI QR) */
export const PosServices = {
  get: async (store_id) => (await API.get(`/master/pos/pos-settings.php${qs({ store_id })}`)).data,
  save: async (data) => (await API.post("/master/pos/update-pos-settings.php", data)).data,
};

/** Bills on hold */
export const HeldServices = {
  list: async (store_id) => (await API.get(`/master/held/held-bills.php${qs({ store_id })}`)).data,
  get: async (held_id, store_id) => (await API.get(`/master/held/held-bills.php${qs({ held_id, store_id })}`)).data,
  save: async (data) => (await API.post("/master/held/add-held.php", data)).data,
  remove: async (held_id, store_id, resumed = false) => (await API.post("/master/held/delete-held.php", { held_id, store_id, resumed })).data,
};

/** Bill preview with coupon / points (same calculation the server saves) */
export const BillServices = {
  quote: async (data) => (await API.post("/master/invoice/quote-bill.php", data)).data,
};

export const CouponServices = {
  list: async (page, size, search, extra = {}) =>
    (await API.get(`/master/coupon/coupons.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  get: async (coupon_id) => (await API.get(`/master/coupon/get-coupon.php${qs({ coupon_id })}`)).data,
  add: async (data) => (await API.post("/master/coupon/add-coupon.php", data)).data,
  update: async (data) => (await API.post("/master/coupon/update-coupon.php", data)).data,
  remove: async (coupon_id) => (await API.post("/master/coupon/delete-coupon.php", { coupon_id })).data,
  check: async (params) => (await API.get(`/master/coupon/check-coupon.php${qs(params)}`)).data,
};

export const LoyaltyServices = {
  settings: async (store_id) => (await API.get(`/master/loyalty/loyalty-settings.php${qs({ store_id })}`)).data,
  save: async (data) => (await API.post("/master/loyalty/update-loyalty-settings.php", data)).data,
  customer: async (customer_id, store_id, limit = 50) => (await API.get(`/master/loyalty/customer-points.php${qs({ customer_id, store_id, limit })}`)).data,
  adjust: async (data) => (await API.post("/master/loyalty/adjust-points.php", data)).data,
};

/** Udhaar / credit */
export const CreditServices = {
  dues: async (page, size, search, extra = {}) => (await API.get(`/master/credit/dues.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  statement: async (params) => (await API.get(`/master/credit/customer-statement.php${qs(params)}`)).data,
  receive: async (data) => (await API.post("/master/credit/add-payment.php", data)).data,
  remind: async (data) => (await API.post("/master/credit/send-reminders.php", data, { timeout: 120000 })).data,
};

export const ActivityServices = {
  list: async (page, size, search, extra = {}) =>
    (await API.get(`/master/activity/activity-log.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
};

export const AutomationServices = {
  get: async (store_id) => (await API.get(`/master/automation/automation-settings.php${qs({ store_id })}`)).data,
  save: async (data) => (await API.post("/master/automation/update-automation-settings.php", data)).data,
  runNow: async (store_id, job) => (await API.post("/master/automation/run-now.php", { store_id, job }, { timeout: 120000 })).data,
  history: async (store_id) => (await API.get(`/master/automation/job-history.php${qs({ store_id })}`)).data,
  tick: async () => (await API.post("/jobs/tick.php", {}, { timeout: 60000 })).data,
};

export const PinServices = {
  setMine: async (data) => (await API.post("/auth/set-approval-pin.php", data)).data,
};
