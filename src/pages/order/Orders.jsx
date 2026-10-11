import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { OrderServices } from "../../services/OrderServices";
import { Chip } from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { InvoiceServices } from "../../services/InvoiceServices";

const Orders = () => {

  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();
  const navigation = useNavigate();
  const access_token = useAuth();
  const navigationUrl = "/order";

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Delete confirmation dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,                    
    pageSize: 5, // ✅ Correct field
  });

  const pageSizeOptions = [5, 10, 20];

  useEffect(() => {
      const message = localStorage.getItem("successMessage");
      if(message){
        setSnackbarMessage(message);
        setSnackbarSeverity('success');
        setOpenSnackbar(true);

        setTimeout(() => {
          setOpenSnackbar(false);
          localStorage.removeItem("successMessage");
        }, 5000);
      }
     
  }, []);
  

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 500); // wait 500ms after last keystroke

    return () => clearTimeout(delayDebounce);
  }, [searchFilter, paginationModel]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const response = await OrderServices.getOrdersData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
        );
          const orderList = response?.data || [];

          const rowsWithId = orderList.map((item) => ({
          ...item,
           id: item.order_id,
        }));

         setOrdersData(rowsWithId);
         setTotalElements(response.total || 0);
         console.log("---orders data---",ordersData);
    } catch (error) {
        console.error("Error fetching Products data:", error);
    } finally {
        setLoading(false);
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

  // Columns with tooltip and actions
  const columns = [
  { field: "id", headerName: "ID", width: 70 },

  {
    field: "order_number",
    headerName: "Order No",
    flex: 1,
  },
  {
    field: "customer_name",
    headerName: "Customer",
    flex: 1,
  },
  {
    field: "user_name",
    headerName: "Created By",
    flex: 1,
  },
  {
    field: "store_name",
    headerName: "Store",
    flex: 1,
  },
  {
    field: "order_date",
    headerName: "Order Date",
    flex: 1,
  },
  {
  field: "total_amount",
  headerName: "Total Amount",
  flex: 1,
    renderCell: (params) => (
      <strong>₹ {parseFloat(params.value || 0).toFixed(2)}</strong>
    )
  },
  {
  field: "status",
  headerName: "Status",
  flex: 1,
  renderCell: (params) => {
    const status = params.value?.toLowerCase();

    let label = params.value;
    let bgColor = "#eee";
    let textColor = "#555";

    if (status === "pending") {
      bgColor = "#fff4e5";   // light orange
      textColor = "#ed6c02";
      label = "Pending ⏳";
    } 
    else if (status === "approved") {
      bgColor = "#e3f2fd";   // light blue
      textColor = "#1976d2";
      label = "Approved ✔";
    } 
    else if (status === "invoiced") {
      bgColor = "#e6f4ea";   // light green
      textColor = "#2e7d32";
      label = "Invoiced 💰";
    } 
    else if (status === "cancelled") {
      bgColor = "#fdecea";   // light red
      textColor = "#d32f2f";
      label = "Cancelled ❌";
    }

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          fontWeight: "bold",
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: "6px",
          px: 1,
        }}
      />
    );
  },
  },
  {
    field: "actions",
    headerName: "Actions",
    flex: 1,
    renderCell: (params) => (
      <>
        <IconButton
          color="primary"
          onClick={(e) => {
           e.stopPropagation();   // ✅ VERY IMPORTANT
          handleEditProduct(params.row);
        }}
        >
        <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          color="secondary"
          onClick={(e) => {
            e.stopPropagation();   // ✅ VERY IMPORTANT
            handleDeleteProduct(params.row.id);
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton
          color="success"
          disabled={params.row.status?.toLowerCase() !== "approved"}
          onClick={(e) => {
            e.stopPropagation();
            handleGenerateInvoice(params.row);
          }}
          >
          <ReceiptIcon fontSize="small" />
        </IconButton>
      </>
    ),
  },
];


  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handlePaginationModelChange = (newPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleAddOrder = () => {
    navigation(navigationUrl)
  };

  const handleViewOrder = (order) => {
    //navigation("/order-details", { state: { productData: order } });
    navigation("/order-details", { state: { order_id: order.order_id } });
  };

  const handleEditProduct = (product) => {
    if(access_token){
      navigation(navigationUrl, {state: { productData: product}});
    }
  };

  const handleDeleteProduct = (id) => {
    setProductToDelete(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
      if (productToDelete) {
        try {
          const data = { order_id: productToDelete };
          await OrderServices.deleteOrderDataFromId(data);  // wait for API delete

          setOrdersData((prevData) =>
            prevData.filter((order) => order.id !== productToDelete)
          );

          setSnackbarMessage("Order deleted successfully!");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
        } catch (error) {
          setSnackbarMessage("Failed to delete Order.",error);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      }
      setOpenDialog(false);
      setProductToDelete(null);
    };


  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Orders
      </Typography>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Add + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Button variant="contained" onClick={handleAddOrder} startIcon={<AddIcon />}>
          Add
        </Button>
        <input
          type="text"
          placeholder="Search..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* DataGrid */}
      {loading ? (
        <Typography variant="body1" color="textSecondary" sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Typography>

      ) : (
        <Paper sx={{ height: 500, width: "100%" }}>
          <DataGrid
            rows={ordersData}
            columns={columns}
            paginationMode="server"
            paginationModel={paginationModel}
            rowCount={totalElements}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onRowClick={(params) => handleViewOrder(params.row)}
            sx={{
              cursor: "pointer",
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />
        </Paper>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Confirmation"
        message="Are you sure you want to delete this order?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
    
  );
};

export default Orders;
