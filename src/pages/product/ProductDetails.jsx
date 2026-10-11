import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate, useLocation } from "react-router-dom";
import { ProductServices } from "../../services/ProductServices";

export default function ProductDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const productData = location.state?.productData;
  const product_id = productData?.product_id || productData?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productDetails, setProductDetails] = useState(null);

  useEffect(() => {
    if (!product_id) {
      setError("Product ID not found");
      setLoading(false);
      return;
    }

    fetchProductDetails();
  }, [product_id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await ProductServices.getProductDataFromId(product_id);
      console.log("Product API Response:", response);
      if (response.status === "success" && response.data) {
        setProductDetails(response.data);
      } else {
        setError(response.message || "Failed to load product details");
      }
    } catch (err) {
      setError("Error fetching product details: " + (err.message || err));
      console.error("Full error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "active") return "success";
    if (statusLower === "inactive") return "error";
    return "default";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/products")}
        >
          Back to Products
        </Button>
      </Box>
    );
  }

  if (!productDetails) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No product details found</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/products")}
          sx={{ mt: 2 }}
        >
          Back to Products
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/products")}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1976d2" }}>
            Product Details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate("/product", { state: { productData: productDetails } })}
        >
          Edit Product
        </Button>
      </Box>

      {/* Product Header Card */}
      <Paper sx={{ p: 3, mb: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={7}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Product Name
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "1.8rem", fontWeight: "bold" }}>
              {productDetails.name}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", mt: 1 }}>
              SKU: {productDetails.sku}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Status
            </Typography>
            <Chip
              label={productDetails.status}
              color={getStatusColor(productDetails.status)}
              size="small"
              sx={{ color: "#fff", fontWeight: "bold" }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Price
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "1.8rem", fontWeight: "bold" }}>
              Rs {productDetails.price}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Product Information Grid */}
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Product ID:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.product_id}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  SKU:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.sku}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Unit:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.unit}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Status:
                </Typography>
                <Chip
                  label={productDetails.status}
                  color={getStatusColor(productDetails.status)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pricing & Store Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Pricing & Store
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Price:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "#d32f2f" }}>
                  Rs {productDetails.price}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Store:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.store_name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Store ID:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.store_id}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Description
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ color: "#555", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {productDetails.description || "No description available"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: "#f0f7ff" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Product Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, p: 1.5, backgroundColor: "#fff", borderRadius: "6px" }}>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Product Name:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, p: 1.5, backgroundColor: "#fff", borderRadius: "6px" }}>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Price:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", color: "#d32f2f" }}>
                  Rs {productDetails.price}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.5, backgroundColor: "#fff", borderRadius: "6px" }}>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Unit:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.unit}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Store Name:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {productDetails.store_name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Current Status:
                </Typography>
                <Chip
                  label={productDetails.status}
                  color={getStatusColor(productDetails.status)}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
