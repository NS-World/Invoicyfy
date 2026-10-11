import axios from "axios";

import API from "./axios";

export const InvoiceServices = {

    createInvoice: async (data) => {
    const response = await API.post(
      "/master/invoice/create_invoice.php",
      data
    );
    return response.data;
  },

  downloadInvoice: async (invoice_id, token) => {
    const res = await API.get(`/download-invoice.php?invoice_id=${invoice_id}`,
      {
        responseType: "blob", // IMPORTANT for PDF
      }
    );
    return res;
  },

  generateInvoice: async (order_id) => {
    const res = await API.get(
      `/master/invoice/generate-invoice.php?order_id=${order_id}`
    );
    return res.data;
  },

};