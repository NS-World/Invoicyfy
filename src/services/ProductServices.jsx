import API from "./axios";

export const ProductServices = {
    getProductsData: async (page, size, search) => {
        const response = await API.get(
        `/master/product/products.php?page=${page + 1}&limit=${size}&search=${search}`
        );
        return response.data;
    },

    postProductData: async (data) => {
        const response = await API.post("/master/product/create-product.php",data);
        return response.data;
    },

    updateProductData: async (data) => {
        const response = await API.put("/master/product/update-product.php",data);
        return response.data;
    },

    getProductDataFromId: async (product_id) => {
        const response = await API.get(`/master/product/find-product.php?product_id=${product_id}`);
        return response.data;
    },

     deleteProductDataFromId: async (data) => {
        const response = await API.put("/master/product/delete-product.php",data);
        return response.data;
    },
};
