import axios from "axios";
import API, { API_BASE_URL } from "./axios";

/** Khanak SaaS: public sign-up and payment (no login, no shop code). */
const pub = axios.create({ baseURL: API_BASE_URL, timeout: 120000, headers: { "Content-Type": "application/json" } });

export const SaasServices = {
  config: async () => (await pub.get("/saas/config.php")).data,
  plans: async () => (await pub.get("/saas/plans.php")).data,
  suggestCode: async (name) => (await pub.get(`/saas/check-shop-code.php?name=${encodeURIComponent(name)}`)).data,
  checkCode: async (code) => (await pub.get(`/saas/check-shop-code.php?code=${encodeURIComponent(code)}`)).data,
  signup: async (data) => (await pub.post("/saas/signup.php", data)).data,
  mockPay: async (orderId) => (await pub.post("/saas/mock-pay.php", { order_id: orderId })).data,
  verifyPayment: async (p) => (await pub.post("/saas/verify-payment.php", p)).data,
  orderStatus: async (orderId, email) => (await pub.get(`/saas/order-status.php?order_id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`)).data,
};

/** Plan & billing inside a shop (signed in). */
export const PlanServices = {
  status: async () => (await API.get("/master/plan/status.php")).data,
  createOrder: async (data) => (await API.post("/master/plan/create-order.php", data)).data,
  mockPay: async (orderId) => (await API.post("/master/plan/mock-pay.php", { order_id: orderId })).data,
  verifyPayment: async (p) => (await API.post("/master/plan/verify-payment.php", p)).data,
};

/** Khanak super admin (own login, token kept separately from shop logins). */
const ADMIN_KEY = "khanakAdminToken";
export const adminToken = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_KEY) || "";
    } catch {
      return "";
    }
  },
  set: (t) => {
    try {
      if (t) sessionStorage.setItem(ADMIN_KEY, t);
      else sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      /* storage blocked */
    }
  },
};
const adm = () => ({ headers: { Authorization: `Bearer ${adminToken.get()}` } });
export const SaasAdminServices = {
  login: async (email, password) => (await pub.post("/saas/admin/login.php", { email, password })).data,
  overview: async () => (await pub.get("/saas/admin/overview.php", adm())).data,
  tenants: async (search = "", status = "") => (await pub.get(`/saas/admin/tenants.php?search=${encodeURIComponent(search)}&status=${status}`, adm())).data,
  tenant: async (id) => (await pub.get(`/saas/admin/tenant.php?tenant_id=${id}`, adm())).data,
  updateTenant: async (data) => (await pub.post("/saas/admin/update-tenant.php", data, adm())).data,
  orders: async (status = "") => (await pub.get(`/saas/admin/orders.php?status=${status}`, adm())).data,
  plans: async () => (await pub.get("/saas/admin/plans.php", adm())).data,
  updatePlan: async (data) => (await pub.post("/saas/admin/update-plan.php", data, adm())).data,
};
