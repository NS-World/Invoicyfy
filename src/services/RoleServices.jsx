import API from "./axios";

export const RoleServices = {

    getRolesData:async (page, size, search) => {
        const response = await API.get( `/master/role/roles.php?page=${page + 1}&limit=${size}&search=${search}`);
        return response.data;
    },

    postRoleData: async (data) => {
        const response = await API.post("/master/role/add-role.php",data);
        return response.data;
    },

    updateRoleData: async (data) => {
        const response = await API.put("/master/role/update-role.php",data);
        return response.data;
    },

    getRoleDataFromId: async (role_id) => {
        const response = await API.put(`/master/role/get-role-data-by-id.php?role_id=${role_id}`);
        return response.data;
    },

     deleteRoleDataFromId: async (data) => {
        const response = await API.put("/master/role/delete-role.php",data);
        return response.data;
    },
};