import API, { qs } from "./axios";

export const StoreServices = {
  getStoresData: async (page, size, search) =>
    (await API.get(`/master/store/stores.php${qs({ page: page + 1, limit: size, search })}`)).data,
  postStoreData: async (data) => (await API.post("/master/store/add-store.php", data)).data,
  updateStoreData: async (data) => (await API.put("/master/store/update-store.php", data)).data,
  getStoreDataFromId: async (store_id) => (await API.get(`/master/store/get-store-by-id.php${qs({ store_id })}`)).data,
  updateInvoiceSettings: async (data) => (await API.post("/master/store/update-invoice-settings.php", data)).data,
  deleteStoreDataFromId: async (data) => (await API.put("/master/store/delete-store.php", data)).data,
};
