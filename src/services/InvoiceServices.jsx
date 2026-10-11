import API, { qs } from "./axios";

export const InvoiceServices = {
  getInvoices: async (page, size, search, extra = {}) =>
    (await API.get(`/master/invoice/invoices.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  getInvoice: async (invoice_id) => (await API.get(`/master/invoice/get-invoice-by-id.php${qs({ invoice_id })}`)).data,
  /** { order_id, invoice_type } or a direct invoice with items. Optional payment: { amount, payment_method } */
  createInvoice: async (data) => (await API.post("/master/invoice/create-invoice.php", data)).data,
  cancelInvoice: async (invoice_id, reason) => (await API.post("/master/invoice/cancel-invoice.php", { invoice_id, reason })).data,
  saveEInvoice: async (data) => (await API.post("/master/invoice/update-einvoice.php", data)).data,
};
