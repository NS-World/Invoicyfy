import API, { qs } from "./axios";

export const InventoryServices = {
  getStock: async (page, size, search, extra = {}) =>
    (await API.get(`/master/inventory/stock.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  adjustStock: async (data) => (await API.post("/master/inventory/adjust-stock.php", data)).data,
  getMovements: async (page, size, extra = {}) =>
    (await API.get(`/master/inventory/stock-movements.php${qs({ page: page + 1, limit: size, ...extra })}`)).data,
};
