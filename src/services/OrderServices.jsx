import API, { qs } from "./axios";

export const OrderServices = {
  getOrdersData: async (page, size, search, extra = {}) =>
    (await API.get(`/master/order/orders.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  // Order + items are saved together; totals and GST are calculated by the server.
  postOrderData: async (data) => (await API.post("/master/order/create-order.php", data)).data,
  updateOrderData: async (data) => (await API.put("/master/order/update-order.php", data)).data,
  getOrderDataFromId: async (order_id) => (await API.get(`/master/order/get-order-by-id.php${qs({ order_id })}`)).data,
  deleteOrderDataFromId: async (data) => (await API.delete("/master/order/delete-order.php", { data })).data,
  updateOrderStatus: async (data) => (await API.put("/master/order/update-order-status.php", data)).data,
  getOrderItems: async (order_id) => (await API.get(`/master/order_items/get-order-items.php${qs({ order_id })}`)).data,
};
