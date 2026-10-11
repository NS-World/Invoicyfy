import API, { qs } from "./axios";

export const PaymentServices = {
  getPayments: async (page, size, search, extra = {}) =>
    (await API.get(`/master/payment/payments.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  createPayment: async (data) => (await API.post("/master/payment/create-payment.php", data)).data,
  deletePayment: async (payment_id) => (await API.delete("/master/payment/delete-payment.php", { data: { payment_id } })).data,
};
