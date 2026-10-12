import API, { qs } from "./axios";

export const CategoryServices = {
  list: async (page = 0, size = 200, search = "", extra = {}) =>
    (await API.get(`/master/category/categories.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  add: async (data) => (await API.post("/master/category/add-category.php", data)).data,
  update: async (data) => (await API.post("/master/category/update-category.php", data)).data,
  remove: async (category_id) => (await API.post("/master/category/delete-category.php", { category_id })).data,
};
