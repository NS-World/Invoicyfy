import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { ProductServices } from "../../services/ProductServices";
import { StoreServices } from "../../services/StoreServices";
import { useNavigate, useLocation } from "react-router-dom";

export default function ProductForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const product = location.state?.productData;
  const product_id = product?.product_id || product?.id; // ✅ SAFE

  const productsUrl = "/products";

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [priceError, setPriceError] = useState("");
    // STATUS
  const [status, setStatus] = useState("Active");
  const [sku, setSku] = useState("");

  const units = ["Kg", "Gram", "Piece", "Box", "Liter"];


  /* ======================
     LOAD PRODUCT (EDIT MODE)
     ====================== */
  useEffect(() => {
    if (!product_id) return;

    setLoading(true);
    ProductServices.getProductDataFromId(product_id)
      .then((res) => {
        const data = res.data;
        setName(data.name || "");
         setSku(data.sku || "");
        setDescription(data.description || "");
        setPrice(data.price || "");
        setUnit(data.unit || "");
        setStoreId(data.store_id || "");
        setStatus(data.status || "Active");
      })
      .catch(() => {
        setMessage({ type: "error", text: "Failed to load product data" });
      })
      .finally(() => setLoading(false));
  }, [product_id]);

  /* ======================
     LOAD STORES (Master Data)
     ====================== */
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await StoreServices.getStoresData(0, 100, "");

        if (res.status === "success") {
          setStores(res.data);
        }
      } catch (error) {
        console.error("Failed to load stores", error);
      }
    };

    fetchStores();
  }, []);

  const selectedStore = stores.find(
  (store) => store.store_id === storeId
   );


  /* ======================
     SUBMIT
     ====================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const priceValidation = validatePrice(price);

    if (priceValidation) {
    setPriceError(priceValidation);
    setLoading(false);
    return;
    }


    setLoading(true);
    setMessage({ type: "", text: "" });

    const payload = {
        product_id,
        name,
        description,
        sku,
        price: price.toString(),
        unit,
        store_id: storeId,
        store_name: selectedStore?.name || "",
        status,
    };

    try {
      const res = product_id
        ? await ProductServices.updateProductData(payload)
        : await ProductServices.postProductData(payload);

      if (res.status === "success") {
        localStorage.setItem(
          "successMessage",
          product_id ? "Product updated successfully" : "Product added successfully"
        );
        navigate(productsUrl);
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

    const validatePrice = (value) => {
        if (!value) return "Price is required";

        if (!/^\d+(\.\d{1,2})?$/.test(value)) {
            return "Enter valid price (max 2 decimal)";
        }

        return "";
    };

    const handlePriceChange = (e) => {
    const value = e.target.value;
    setPrice(value);
    setPriceError(validatePrice(value));
    };




  /* ======================
     UI
     ====================== */
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {product_id ? "Edit Product" : "Add Product"}
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Product Name"
            placeholder="Example: Kaju Katli"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
                fullWidth
                label="SKU / Product Code"
                placeholder="Example: KAJU001"
                value={sku}
                margin="normal"
                onChange={(e) => setSku(e.target.value)}
                 required
              />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Price"
            type="number"
            value={price}
            margin="normal"
            onChange={handlePriceChange}
            error={Boolean(priceError)}
            helperText={priceError}
            slotProps={{
                htmlInput: {
                step: "0.01",
                min: 0
                }
            }}
            />


          <FormControl fullWidth margin="normal" required>
            <InputLabel>Unit</InputLabel>
            <Select
                value={unit}
                label="Unit"
                onChange={(e) => setUnit(e.target.value)}
            >
                {units.map((u) => (
                <MenuItem key={u} value={u}>
                    {u}
                </MenuItem>
                ))}
            </Select>
            </FormControl>

            {/* STATUS */}
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>



          {/* Store Dropdown */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="store-label">Store</InputLabel>

            <Select
              labelId="store-label"
              value={storeId}
              label="Store"
              onChange={(e) => setStoreId(e.target.value)}
            >
              {stores.map((store) => (
                <MenuItem key={store.store_id} value={store.store_id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Saving..." : product_id ? "Update Product" : "Add Product"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
