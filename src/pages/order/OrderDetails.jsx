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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate, useLocation } from "react-router-dom";
import { OrderServices } from "../../services/OrderServices";
import { CustomerServices } from "../../services/CustomerServices";
import { ProductServices } from "../../services/ProductServices";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { InvoiceServices } from "../../services/InvoiceServices";

export default function OrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const order_id = location.state?.order_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderDetails, setOrderDetails] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  // Dialog states
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ product_id: "", quantity: "", unit_price: "" });
  const [products, setProducts] = useState([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Delete confirmation
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
  if (order_id) {
    fetchProducts().then(() => {
      fetchOrderDetails();
    });
  }
}, [order_id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await OrderServices.getOrderDataFromId(order_id);
      if (response.status === "success" && response.order) {
        setOrderDetails(response.order);

        // Fetch customer details
        if (response.order.customer_id) {
          try {
            const customerResponse = await CustomerServices.getCustomerDataFromId(
              response.order.customer_id
            );
            if (customerResponse.status === "success" && customerResponse.data) {
              setCustomerDetails(customerResponse.data);
            }
          } catch (custErr) {
            console.error("Error fetching customer details:", custErr);
          }
        }

        // Fetch order items
        try {
          const itemsResponse = await OrderServices.getOrderItems(order_id);
          console.log("=== Order Items Response ===");
          console.log("Full Response:", itemsResponse);
          console.log("Response Type:", typeof itemsResponse);
          console.log("Is Array:", Array.isArray(itemsResponse));
          console.log("Keys:", itemsResponse ? Object.keys(itemsResponse) : "N/A");
          
          if (itemsResponse && itemsResponse.status === "success") {
            console.log("✓ Response status is success");
            // New API format: { status, summary, items: [] }
            const itemsData = itemsResponse.items || [];
            console.log("Items data extracted:", itemsData);
            console.log("Items count:", itemsData.length);
            if (Array.isArray(itemsData)) {
              setOrderItems(itemsData);
              console.log("✓ Items set successfully, count:", itemsData.length);
            } else {
              console.warn("❌ Items is not an array:", typeof itemsData, itemsData);
              setOrderItems([]);
            }
          } else if (Array.isArray(itemsResponse)) {
            // Fallback: direct array response
            console.log("✓ Using direct array fallback, count:", itemsResponse.length);
            setOrderItems(itemsResponse);
          } else {
            console.warn("❌ Unexpected response format:", itemsResponse);
            setOrderItems([]);
          }
        } catch (itemsErr) {
          console.error("❌ Error fetching order items:", itemsErr);
          setOrderItems([]);
        }
      } else {
        setError(response.message || "Failed to load order details");
      }
    } catch (err) {
      setError("Error fetching order details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await ProductServices.getProductsData(0, 100, "");
      console.log("Products response:", response);
      if (response.data) {
        setProducts(response.data);
      } else if (Array.isArray(response)) {
        setProducts(response);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({ product_id: "", quantity: "", unit_price: "" });
    setOpenItemDialog(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    setOpenItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.product_id || !itemForm.quantity || !itemForm.unit_price) {
      setSnackbar({ open: true, message: "Please fill all fields", severity: "error" });
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        console.log("Updating item:", editingItem.order_item_id);
        const updateResponse = await OrderServices.updateOrderItems({
          items: [
            {
              order_item_id: editingItem.order_item_id,
              quantity: parseInt(itemForm.quantity),
              unit_price: parseFloat(itemForm.unit_price),
            },
          ],
        });
        console.log("Item update response:", updateResponse);
        setSnackbar({ open: true, message: "Item updated successfully", severity: "success" });
      } else {
        // Add new item
        console.log("Creating new item for order:", order_id);
        const createResponse = await OrderServices.createOrderItems({
          order_id: order_id,
          items: [
            {
              product_id: parseInt(itemForm.product_id),
              quantity: parseInt(itemForm.quantity),
              unit_price: parseFloat(itemForm.unit_price),
            },
          ],
        });
        console.log("Item create response:", createResponse);
        setSnackbar({ open: true, message: "Item added successfully", severity: "success" });
      }
      
      setOpenItemDialog(false);
      await fetchOrderDetails();
    } catch (err) {
      console.error("Error saving item:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error saving item";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handlePrintInvoice = async (order) => {
  const res = await InvoiceServices.generateInvoice(order.order_id);

  const pdfWindow = window.open("");
  pdfWindow.document.write(
    `<iframe width='100%' height='100%' src='data:application/pdf;base64,${res.file}'></iframe>`
  );
};

const handleGenerateInvoice = async (order) => {
  try {
    if (order.status?.toLowerCase() !== "approved") {
      alert("Only approved orders allowed");
      return;
    }

    const res = await InvoiceServices.generateInvoice(order.order_id);

    if (res.status !== "success") {
      throw new Error(res.message);
    }

    // ✅ BASE64 → BLOB
    const byteCharacters = atob(res.file);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    const url = window.URL.createObjectURL(blob);

    // ✅ DOWNLOAD
    const link = document.createElement("a");
    link.href = url;
    link.download = res.file_name;
    link.click();

  } catch (err) {
    console.error(err);
    alert("Invoice failed");
  }
};

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteItem = async () => {
    try {
      console.log("Deleting item:", itemToDelete.order_item_id);
      const deleteResponse = await OrderServices.deleteOrderItems({
        order_item_ids: [itemToDelete.order_item_id],
      });
      console.log("Item delete response:", deleteResponse);
      setSnackbar({ open: true, message: "Item deleted successfully", severity: "success" });
      await fetchOrderDetails();
    } catch (err) {
      console.error("Error deleting item:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error deleting item";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setOpenDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      console.log("Updating status to:", newStatus);
      const response = await OrderServices.updateOrderStatus({
        order_id: order_id,
        status: newStatus,
      });
      console.log("Status update response:", response);
      setSnackbar({ open: true, message: "Status updated successfully", severity: "success" });
      await fetchOrderDetails();
    } catch (err) {
      console.error("Error updating status:", err);
      setSnackbar({ open: true, message: err.response?.data?.message || "Error updating status", severity: "error" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "invoiced" || statusLower === "approved") return "success";
    if (statusLower === "pending") return "warning";
    if (statusLower === "cancelled") return "error";
    return "default";
  };

  const getStatusBackground = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "invoiced" || statusLower === "approved") return "#4caf50";
    if (statusLower === "pending") return "#ff9800";
    if (statusLower === "cancelled") return "#f44336";
    return "#858585";
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const getProductName = (productId) => {
  const product = products.find(
    (p) => String(p.product_id) === String(productId)
  );
   return product?.name || "Unknown Product";
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
          onClick={() => navigate("/orders")}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  if (!orderDetails) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No order details found</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/orders")}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/orders")}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1976d2" }}>
            Order Details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate("/order", { state: { productData: orderDetails } })}
        >
          Edit Order
        </Button>
        <Button
        variant="contained"
        color="success"
        onClick={() => handleGenerateInvoice(order)}
        >
        Download Invoice
        </Button>

        <Button
        variant="outlined"
        onClick={() => handlePrintInvoice(order)}
        >
        Print Invoice
        </Button>
      </Box>

      {/* Order Header Card */}
      <Paper sx={{ p: 3, mb: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Order Number
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "1.8rem", fontWeight: "bold" }}>
              {orderDetails.order_number}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Status
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Chip
                label={orderDetails.status?.charAt(0).toUpperCase() + orderDetails.status?.slice(1) || "Pending"}
                color={getStatusColor(orderDetails.status)}
                variant="filled"
                sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.95rem" }}
              />
              <FormControl sx={{ minWidth: 140 }} size="small" disabled={updatingStatus}>
                <Select
                  value={orderDetails.status || "pending"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  sx={{
                    color: "#fff",
                    fontSize: "0.9rem",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.7)" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
                    ".MuiSvgIcon-root": { color: "#fff" },
                  }}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="invoiced">Invoiced</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>
              Total Amount
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "1.8rem", fontWeight: "bold" }}>
              Rs {(parseFloat(orderDetails.total_amount) || 0).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Customer Information */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Customer Name:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {orderDetails.customer_name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Email:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {customerDetails?.email || "N/A"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Phone:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {customerDetails?.phone || "N/A"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Address:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", textAlign: "right" }}>
                  {customerDetails?.address || "N/A"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#1976d2" }}>
                Order Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Order Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {orderDetails.order_date}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Store:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {orderDetails.store_name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Created By:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {orderDetails.user_name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#666", fontWeight: "500" }}>
                  Order ID:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {orderDetails.order_id}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Order Items Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2" }}>
              Order Items
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {orderItems && orderItems.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Product</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      Quantity
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      Unit Price
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.order_item_id}>
                      <TableCell>{getProductName(item.product_id)}</TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">Rs {(parseFloat(item.unit_price) || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        Rs {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                      </TableCell>
                      {/* <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditItem(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No items in this order. Click "Add Item" to get started.</Alert>
          )}

          {orderItems && orderItems.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "2px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Order Items Total: <strong>Rs {calculateTotal().toFixed(2)}</strong>
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Product</InputLabel>
            <Select
              value={itemForm.product_id}
              label="Product"
              onChange={(e) => setItemForm({ ...itemForm, product_id: e.target.value })}
            >
              {products.map((product) => (
                <MenuItem key={product.product_id} value={product.product_id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={itemForm.quantity}
            onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
            sx={{ mb: 2 }}
            inputProps={{ min: "1" }}
          />

          <TextField
            fullWidth
            label="Unit Price"
            type="number"
            value={itemForm.unit_price}
            onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
            inputProps={{ min: "0", step: "0.01" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenItemDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {editingItem ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message="Are you sure you want to remove this item from the order?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {snackbar.severity === "error" ? (
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="error">
            {snackbar.message}
          </Alert>
        ) : (
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success">
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
