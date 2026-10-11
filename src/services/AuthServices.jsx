import API from "./axios";

export const AuthServices = {
  postLoginData: (email, password) => API.post("/auth/signin.php", { email, password }),
  me: async () => (await API.get("/auth/me.php")).data,
  changePassword: async (data) => (await API.post("/auth/change-password.php", data)).data,
};
