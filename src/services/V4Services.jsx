import API, { qs } from "./axios";

const list = (url) => async (page, size, search, extra = {}) => (await API.get(`${url}${qs({ page: page + 1, limit: size, search, ...extra })}`)).data;

/** Suppliers and what we owe them */
export const SupplierServices = {
  list: list("/master/supplier/suppliers.php"),
  get: async (supplier_id) => (await API.get(`/master/supplier/get-supplier.php${qs({ supplier_id })}`)).data,
  add: async (data) => (await API.post("/master/supplier/add-supplier.php", data)).data,
  update: async (data) => (await API.post("/master/supplier/update-supplier.php", data)).data,
  remove: async (supplier_id) => (await API.post("/master/supplier/delete-supplier.php", { supplier_id })).data,
  pay: async (data) => (await API.post("/master/supplier/add-payment.php", data)).data,
  removePayment: async (payment_id) => (await API.post("/master/supplier/delete-payment.php", { payment_id })).data,
};

/** Purchase bills (stock in) */
export const PurchaseServices = {
  list: list("/master/purchase/purchases.php"),
  get: async (purchase_id) => (await API.get(`/master/purchase/get-purchase.php${qs({ purchase_id })}`)).data,
  create: async (data) => (await API.post("/master/purchase/create-purchase.php", data)).data,
  update: async (data) => (await API.post("/master/purchase/update-purchase.php", data)).data,
  cancel: async (purchase_id, reason) => (await API.post("/master/purchase/cancel-purchase.php", { purchase_id, reason })).data,
};

export const RecipeServices = {
  list: async (params = {}) => (await API.get(`/master/recipe/recipes.php${qs(params)}`)).data,
  get: async (product_id) => (await API.get(`/master/recipe/get-recipe.php${qs({ product_id })}`)).data,
  save: async (product_id, items) => (await API.post("/master/recipe/save-recipe.php", { product_id, items })).data,
};

/** Batches, expiry and wastage */
export const BatchServices = {
  list: list("/master/batch/batches.php"),
  expiring: async (params = {}) => (await API.get(`/master/batch/expiring.php${qs(params)}`)).data,
  wastage: list("/master/inventory/wastage.php"),
  addWastage: async (data) => (await API.post("/master/inventory/add-wastage.php", data)).data,
};

/** Combo and happy-hour offers */
export const ComboServices = {
  list: async (store_id) => (await API.get(`/master/offer/offers.php${qs({ store_id })}`)).data,
  running: async (store_id) => (await API.get(`/master/offer/active-offers.php${qs({ store_id })}`)).data,
  add: async (data) => (await API.post("/master/offer/add-offer.php", data)).data,
  update: async (data) => (await API.post("/master/offer/update-offer.php", data)).data,
  remove: async (offer_id) => (await API.post("/master/offer/delete-offer.php", { offer_id })).data,
};

/** Swiggy / Zomato / other platform orders */
export const OnlineServices = {
  list: list("/master/online/online-orders.php"),
  settle: async (data) => (await API.post("/master/online/mark-settled.php", data)).data,
};

export const BillLinkServices = {
  send: async (data) => (await API.post("/master/invoice/send-bill.php", data)).data,
};

export const V4ReportServices = {
  staff: async (params) => (await API.get(`/reports/staff.php${qs(params)}`)).data,
  owner: async (params = {}) => (await API.get(`/reports/dashboard/owner.php${qs(params)}`)).data,
  gstr1: async (params) => (await API.get(`/reports/gstr1.php${qs(params)}`, { timeout: 120000 })).data,
};

/** Automatic backup to the server and Google Drive (Admin) */
export const DriveServices = {
  get: async () => (await API.get("/master/backup/drive-settings.php")).data,
  save: async (data) => (await API.post("/master/backup/update-drive-settings.php", data)).data,
  connect: async (returnUrl) => (await API.get(`/master/backup/drive-connect.php${qs({ return: returnUrl })}`)).data,
  disconnect: async () => (await API.post("/master/backup/drive-disconnect.php", {})).data,
  runNow: async () => (await API.post("/master/backup/create-backup-now.php", {}, { timeout: 600000 })).data,
  download: async (file) => (await API.get(`/master/backup/download-backup.php${qs({ file })}`, { responseType: "blob", timeout: 600000 })).data,
};
