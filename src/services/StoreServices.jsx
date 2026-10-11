import API from "./axios";

export const StoreServices = {
    getStoresData: async (page, size, search) => {
        const response = await API.get(
        `/master/store/stores.php?page=${page + 1}&limit=${size}&search=${search}`
        );
        return response.data;
    },

    postStoreData: async (data) => {
        const response = await API.post("/master/store/add-store.php",data);
        return response.data;
    },

    updateStoreData: async (data) => {
        const response = await API.put("/master/store/update-store.php",data);
        return response.data;
    },

    getStoreDataFromId: async (store_id) => {
        const response = await API.put(`/master/store/get-store-by-id.php?store_id=${store_id}`);
        return response.data;
    },

     deleteStoreDataFromId: async (data) => {
        const response = await API.put("/master/store/delete-store.php",data);
        return response.data;
    },
};
