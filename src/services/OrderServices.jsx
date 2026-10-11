import API from "./axios";

export const OrderServices = {
    // Order APIs
    getOrdersData: async (page, size, search) => {
        const response = await API.get(
        `/master/order/orders.php?page=${page + 1}&limit=${size}&search=${search}`
        );
        return response.data;
    },

    postOrderData: async (data) => {
        const response = await API.post("/master/order/create-order.php",data);
        return response.data;
    },

    updateOrderData: async (data) => {
        const response = await API.put("/master/order/update-order.php",data);
        return response.data;
    },

    getOrderDataFromId: async (order_id) => {
        const response = await API.get(`/master/order/get-order-by-id.php?order_id=${order_id}`);
        return response.data;
    },

    deleteOrderDataFromId: async (data) => {
        const response = await API.delete("/master/order/delete-order.php", { data });
        return response.data;
    },

    updateOrderStatus: async (data) => {
        const response = await API.put("/master/order/update-order-status.php", data);
        return response.data;
    },

    // Order Items APIs
    createOrderItems: async (data) => {
        const response = await API.post("/master/order_items/create-order-item.php", data);
        return response.data;
    },

    updateOrderItems: async (data) => {
        const response = await API.post("/master/order_items/update-order-items.php", data);
        return response.data;
    },

    deleteOrderItems: async (data) => {
        const response = await API.delete("/master/order_items/delete-order-items.php", { data });
        return response.data;
    },

    getOrderItems: async (order_id) => {
        const response = await API.get(`/master/order_items/get-order-items.php?order_id=${order_id}`);
        return response.data;
    },
};
