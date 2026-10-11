import API from "./axios";

export const UserServices = {

    getUsersData:async (page, size, search) => {
        const response = await API.get( `/master/user/get-users.php?page=${page + 1}&limit=${size}&search=${search}`);
        return response.data;
    },

    postUserData: async (data) => {
        const response = await API.post("/master/user/create-user.php",data);
        return response.data;
    },

    updateUserData: async (data) => {
        const response = await API.post("/master/user/update-user.php",data);
        return response.data;
    },

  getUserDataFromId: (id) =>
  API.get(`/master/user/get_user_by_id.php?user_id=${id}`),


     deleteUserDataFromId: async (data) => {
        const response = await API.put("/master/user/delete-user.php",data);
        return response.data;
    },
};