import API, { qs } from "./axios";

export const CustomerServices = {
  // page is 0-based (DataGrid), API is 1-based
  getCustomersData: async (page, size, search, extra = {}) =>
    (await API.get(`/master/customer/customers.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  postCustomerData: async (data) => (await API.post("/master/customer/add-customer.php", data)).data,
  updateCustomerData: async (data) => (await API.put("/master/customer/update-customer.php", data)).data,
  getCustomerDataFromId: async (customer_id) => (await API.get(`/master/customer/get_customer_by_id.php${qs({ customer_id })}`)).data,
  deleteCustomerDataFromId: async (data) => (await API.put("/master/customer/delete-customer.php", data)).data,
};
