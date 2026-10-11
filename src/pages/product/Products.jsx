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
import { ProductServices } from "../../services/ProductServices";

const Products = () => {

  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();
  const navigation = useNavigate();
  const access_token = useAuth();
  const navigationUrl = "/product";

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
        const response = await ProductServices.getProductsData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
        );

          const productList = response?.data || [];

          const rowsWithId = productList.map((item) => ({
          ...item,
           id: item.product_id,
        }));

         setProductsData(rowsWithId);
         setTotalElements(response.total || 0);
         console.log("---products data---",productsData);
    } catch (error) {
        console.error("Error fetching Products data:", error);
    } finally {
        setLoading(false);
    }
  };

  // Columns with tooltip and actions
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "name",
      headerName: "Product Name",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "sku",
      headerName: "SKU",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "price",
      headerName: "Price",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "unit",
      headerName: "Unit",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "store_name",
      headerName: "Store",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <div>
          <IconButton
            color="primary"
            onClick={() => handleEditProduct(params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="secondary"
            onClick={() => handleDeleteProduct(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handlePaginationModelChange = (newPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleAddCustomer = () => {
    navigation(navigationUrl)
  };

  const handleViewProduct = (product) => {
    navigation("/product-details", { state: { productData: product } });
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
          const data = { product_id: productToDelete };
          await ProductServices.deleteProductDataFromId(data);  // wait for API delete

          setProductsData((prevData) =>
            prevData.filter((product) => product.id !== productToDelete)
          );

          setSnackbarMessage("Product deleted successfully!");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
        } catch (error) {
          setSnackbarMessage("Failed to delete Product.",error);
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
        Products
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
        <Button variant="contained" onClick={handleAddCustomer} startIcon={<AddIcon />}>
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
            rows={productsData}
            columns={columns}
            paginationMode="server"
            paginationModel={paginationModel}
            rowCount={totalElements}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onRowClick={(params) => handleViewProduct(params.row)}
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
        message="Are you sure you want to delete this product?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
  );
};

export default Products;
