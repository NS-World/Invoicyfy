import API from "./axios";

export const AuthServices = {

postLoginData: async (email, password) => {
        const response = await API.post("/auth/signin.php", {email, password });
        return response;
    }
};