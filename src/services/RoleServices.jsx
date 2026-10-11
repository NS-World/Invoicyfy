import API, { qs } from "./axios";

export const RoleServices = {
  getRolesData: async (page, size, search) =>
    (await API.get(`/master/role/roles.php${qs({ page: page + 1, limit: size, search })}`)).data,
  postRoleData: async (data) => (await API.post("/master/role/add-role.php", data)).data,
  updateRoleData: async (data) => (await API.put("/master/role/update-role.php", data)).data,
  getRoleDataFromId: async (role_id) => (await API.get(`/master/role/get-role-data-by-id.php${qs({ role_id })}`)).data,
  deleteRoleDataFromId: async (data) => (await API.put("/master/role/delete-role.php", data)).data,
};
