import API from "./axios";

export const CustomerServices = {

    getCustomersData:async (page, size, search) => {
        const response = await API.get( `/master/customer/customers.php?page=${page + 1}&limit=${size}&search=${search}`);
        return response.data;
    },

    postCustomerData: async (data) => {
        const response = await API.post("/master/customer/add-customer.php",data);
        return response.data;
    },

    updateCustomerData: async (data) => {
        const response = await API.put("/master/customer/update-customer.php",data);
        return response.data;
    },

    getCustomerDataFromId: async (customer_id) => {
        const response = await API.get(`/master/customer/get_customer_by_id.php?customer_id=${customer_id}`);
        return response.data;
    },

     deleteCustomerDataFromId: async (data) => {
        const response = await API.put("/master/customer/delete-customer.php",data);
        return response.data;
    },
};