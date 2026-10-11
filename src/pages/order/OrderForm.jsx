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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { OrderServices } from "../../services/OrderServices";
import { CustomerServices } from "../../services/CustomerServices";
import { UserServices } from "../../services/UserServices";
import { StoreServices } from "../../services/StoreServices";
import { ProductServices } from "../../services/ProductServices";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function OrderForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();

  const order = location.state?.productData; // Note: productData is actually order data from Orders.jsx
  const order_id = order?.order_id;

  const ordersUrl = "/orders";

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Order fields
  const [orderNumber, setOrderNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [userId, setUserId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Items
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0 }]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  /* ======================
     LOAD MASTER DATA FIRST
     ====================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, usersRes, storesRes, productsRes] = await Promise.all([
          CustomerServices.getCustomersData(0, 100, ""),
          UserServices.getUsersData(0, 100, ""),
          StoreServices.getStoresData(0, 100, ""),
          ProductServices.getProductsData(0, 100, "")
        ]);

        console.log("Master data responses:", { customersRes, usersRes, storesRes, productsRes });

        if (customersRes?.status === "success") {
          console.log("Customers loaded:", customersRes.data);
          setCustomers(customersRes.data);
        }
        if (usersRes?.status === "success") {
          console.log("Users loaded:", usersRes.data);
          setUsers(usersRes.data);
        }
        if (storesRes?.status === "success") {
          console.log("Stores loaded:", storesRes.data);
          setStores(storesRes.data);
        }
        if (productsRes?.status === "success") {
          console.log("Products loaded:", productsRes.data);
          setProducts(productsRes.data);
        }

        setMasterDataLoaded(true);
      } catch (error) {
        console.error("Failed to load master data", error);
        setMessage({ type: "error", text: "Failed to load dropdown data" });
      }
    };

    fetchData();
  }, []);

  /* ======================
     LOAD ORDER (EDIT MODE) - Only when master data is ready
     ====================== */
  useEffect(() => {
    if (!order_id || !masterDataLoaded) {
      console.log("Skipping order load - order_id:", order_id, "masterDataLoaded:", masterDataLoaded);
      return;
    }

    console.log("Loading order data now that master data is ready");
    setLoading(true);
    Promise.all([
      OrderServices.getOrderDataFromId(order_id),
      OrderServices.getOrderItems(order_id)
    ])
      .then(([orderRes, itemsRes]) => {
        console.log("Order Response:", orderRes);
        console.log("Items Response:", itemsRes);
        
        // Handle nested response structure (order inside data field)
        const orderData = orderRes?.order || orderRes?.data || orderRes || {};
        
        console.log("Extracted Order Data:", orderData);
        console.log("Available customers:", customers);
        console.log("Available users:", users);
        console.log("Available stores:", stores);
        
        // Set all order fields
        const orderNum = String(orderData.order_number || "");
        const custId = String(orderData.customer_id || "");
        const userId = String(orderData.user_id || "");
        const storId = String(orderData.store_id || "");
        const ordDate = String(orderData.order_date || new Date().toISOString().split('T')[0]);
        const totalAmt = parseFloat(orderData.total_amount || 0);
        
        console.log("Setting order values:", { orderNum, custId, userId, storId, ordDate, totalAmt });
        
        // Verify values exist in dropdown lists
        const custExists = customers.find(c => String(c.customer_id) === custId);
        const userExists = users.find(u => String(u.user_id) === userId);
        const storeExists = stores.find(s => String(s.store_id) === storId);
        
        console.log("Value verification:", { custExists, userExists, storeExists });
        
        setOrderNumber(orderNum);
        setCustomerId(custId);
        setUserId(userId);
        setStoreId(storId);
        setOrderDate(ordDate);
        setTotalAmount(totalAmt);

        // Set items - handle multiple response structures
        let itemsList = [];
        if (Array.isArray(itemsRes?.items)) {
          itemsList = itemsRes.items;
        } else if (Array.isArray(itemsRes?.data)) {
          itemsList = itemsRes.data;
        } else if (itemsRes?.order_items) {
          itemsList = itemsRes.order_items;
        }
        
        console.log("Setting items:", itemsList);
        
        if (itemsList.length > 0) {
          setItems(itemsList.map(item => ({
            product_id: String(item.product_id || ""),
            quantity: parseInt(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price) || 0
          })));
        }
      })
      .catch((err) => {
        console.error("Failed to load order:", err);
        setMessage({ type: "error", text: "Failed to load order data: " + (err.message || "Unknown error") });
      })
      .finally(() => setLoading(false));
  }, [order_id, masterDataLoaded]);

  /* ======================
     SET DEFAULTS FOR CREATE MODE
     ====================== */
  useEffect(() => {
    if (order_id || !masterDataLoaded) return; // Skip if editing or master data not ready
    
    // Set default user and store for new order
    if (auth?.user?.user_id) {
      setUserId(String(auth.user.user_id));
    }
    if (auth?.user?.store_id) {
      setStoreId(String(auth.user.store_id));
    }
  }, [auth?.user?.user_id, auth?.user?.store_id, order_id, masterDataLoaded]);

  /* ======================
     CALCULATE TOTAL
     ====================== */
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    setTotalAmount(total);
  }, [items]);

  /* ======================
     ITEM HANDLERS
     ====================== */
  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    
    if (field === "quantity") {
      newItems[index][field] = Math.max(1, parseInt(value) || 1);
    } else if (field === "unit_price") {
      newItems[index][field] = Math.max(0, parseFloat(value) || 0);
    } else {
      newItems[index][field] = value;
    }

    // If product changed, set unit_price from product
    if (field === "product_id") {
      const product = products.find(p => p.product_id == value);
      if (product) {
        newItems[index].unit_price = product.price || 0;
      }
    }

    setItems(newItems);
  };

  /* ======================
     SUBMIT
     ====================== */
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!customerId || !userId || !storeId || !orderDate) {
    setMessage({ type: "error", text: "Please fill all required fields" });
    return;
  }

  setLoading(true);

  try {
    let currentOrderId = order_id;

    // =========================
    // ✅ STEP 1: CREATE or UPDATE ORDER
    // =========================
    const payload = {
      order_id: order_id || null,
      order_number: orderNumber,
      customer_id: customerId,
      user_id: userId,
      store_id: storeId,
      order_date: orderDate,
      total_amount: totalAmount,
    };

    let res;

    if (order_id) {
      // 👉 EDIT
      res = await OrderServices.updateOrderData(payload);
    } else {
      // 👉 CREATE
      res = await OrderServices.postOrderData(payload);
      currentOrderId = res?.order_id || res?.data?.order_id;
    }

    if (!currentOrderId) {
      throw new Error("Order ID not returned from API");
    }

    // =========================
    // ✅ STEP 2: SEND ALL ITEMS (NO SPLIT LOGIC)
    // =========================
    await OrderServices.createOrderItems({
      order_id: currentOrderId,
      items: items.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
      })),
    });

    // =========================
    // ✅ DONE
    // =========================
    localStorage.setItem(
      "successMessage",
      order_id ? "Order updated successfully" : "Order created successfully"
    );

    navigate("/orders");

  } catch (err) {
    console.error(err);
    setMessage({
      type: "error",
      text: err.response?.data?.message || err.message || "Operation failed",
    });
  } finally {
    setLoading(false);
  }
  };

  const isFirstItemValid = items.length > 0 && items[0].product_id;

  const isFormValid =
  customerId &&
  userId &&
  storeId &&
  items.every(item => item.product_id);
  /* ======================
     UI
     ====================== */
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: "bold" }}>
          {order_id ? "Edit Order" : "Create Order"}
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <>
        {!masterDataLoaded && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Loading form data...
          </Alert>
        )}

        {loading && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Loading order data...
          </Alert>
        )}
        </>

        <Box component="form" onSubmit={handleSubmit}>
          {/* Order Header */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Order Number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Order Date"
                  type="date"
                  value={orderDate || ""}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                  inputProps={{ max: new Date().toISOString().split('T')[0] }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Customer, User, Store */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500, color: "#555" }}>
              Order Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel id="customer-label" sx={{ backgroundColor: "white", px: 1 }}>
                    Customer *
                  </InputLabel>
                  <Select
                    labelId="customer-label"
                    value={String(customerId)}
                    onChange={(e) => setCustomerId(e.target.value)}
                    label="Customer *"
                    size="small"
                  >
                    <MenuItem value="">
                      <em>Select Customer</em>
                    </MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.customer_id} value={String(customer.customer_id)}>
                        {customer.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel id="user-label" sx={{ backgroundColor: "white", px: 1 }}>
                    User *
                  </InputLabel>
                  <Select
                    labelId="user-label"
                    value={String(userId)}
                    onChange={(e) => setUserId(e.target.value)}
                    label="User *"
                    size="small"
                  >
                    <MenuItem value="">
                      <em>Select User</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.user_id} value={user.user_id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel id="store-label" sx={{ backgroundColor: "white", px: 1 }}>
                    Store *
                  </InputLabel>
                  <Select
                    labelId="store-label"
                    value={String(storeId)}
                    onChange={(e) => setStoreId(e.target.value)}
                    label="Store *"
                    size="small"
                  >
                    <MenuItem value="">
                      <em>Select Store</em>
                    </MenuItem>
                    {stores.map((store) => (
                      <MenuItem key={store.store_id} value={store.store_id}>
                        {store.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Order Items Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: "bold" }}>
            Order Items
          </Typography>

          <TableContainer component={Paper} sx={{ mb: 2, border: "1px solid #ddd" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                <TableRow>
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
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={String(item.product_id)}
                          onChange={(e) => updateItem(index, "product_id", e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Select Product</MenuItem>
                          {products.map((product) => (
                            <MenuItem key={product.product_id} value={product.product_id}>
                              {product.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        inputProps={{ min: 1, style: { textAlign: "center" } }}
                        sx={{ width: "80px" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: "100px" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: "500" }}>
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="contained"
            color="primary"
            size="small"
            disabled={!isFirstItemValid}
            sx={{
              minWidth: "120px",
              opacity: !isFirstItemValid ? 0.6 : 1,
            }}
          >
            Add Item
          </Button>

            <Box sx={{ ml: "auto" }}>
              <Typography variant="subtitle1" sx={{ textAlign: "right", fontWeight: "bold" }}>
                Total Amount:{" "}
                <span style={{ color: "#1976d2", fontSize: "1.1em" }}>
                  {totalAmount.toFixed(2)}
                </span>
              </Typography>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-start", mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || !isFormValid}
              sx={{ minWidth: "140px" }}
            >
              {loading ? "Saving..." : order_id ? "Update Order" : "Create Order"}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate(ordersUrl)}
              sx={{ minWidth: "140px" }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
