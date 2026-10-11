import API, { qs } from "./axios";

export const ReportServices = {
  dashboard: async (params) => (await API.get(`/reports/dashboard.php${qs(params)}`)).data,
  sales: async (params) => (await API.get(`/reports/sales.php${qs(params)}`)).data,
  gstSummary: async (params) => (await API.get(`/reports/gst-summary.php${qs(params)}`)).data,
  profitLoss: async (params) => (await API.get(`/reports/profit-loss.php${qs(params)}`)).data,
  meta: async () => (await API.get("/master/settings/meta.php")).data,
};
