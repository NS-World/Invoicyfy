import API, { qs } from "./axios";

export const UserServices = {
  getUsersData: async (page, size, search) =>
    (await API.get(`/master/user/get-users.php${qs({ page: page + 1, limit: size, search })}`)).data,
  postUserData: async (data) => (await API.post("/master/user/create-user.php", data)).data,
  updateUserData: async (data) => (await API.put("/master/user/update-user.php", data)).data,
  getUserDataFromId: async (user_id) => (await API.get(`/master/user/get_user_by_id.php${qs({ user_id })}`)).data,
  deleteUserDataFromId: async (data) => (await API.put("/master/user/delete-user.php", data)).data,
};
