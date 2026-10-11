import API, { qs } from "./axios";

export const ProductServices = {
  getProductsData: async (page, size, search, extra = {}) =>
    (await API.get(`/master/product/products.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  postProductData: async (data) => (await API.post("/master/product/create-product.php", data)).data,
  updateProductData: async (data) => (await API.put("/master/product/update-product.php", data)).data,
  getProductDataFromId: async (product_id) => (await API.get(`/master/product/find-product.php${qs({ product_id })}`)).data,
  deleteProductDataFromId: async (data) => (await API.put("/master/product/delete-product.php", data)).data,
  getCategories: async () => (await API.get("/master/product/categories.php")).data,
};
