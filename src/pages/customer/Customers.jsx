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
import { CustomerServices } from "../../services/CustomerServices";
import { useAuth } from "../../context/useAuth";

const Customers = () => {

  const [customersData, setCustomersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();
  const navigation = useNavigate();
  const access_token = useAuth();
  const navigationUrl = "/customer";

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Delete confirmation dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

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
        const response = await CustomerServices.getCustomersData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
        );

        const rowsWithId = (response.data || []).map((item) => ({
      ...item,
      id: item.customer_id, // DataGrid requires this
    }));

        setCustomersData(rowsWithId || []);
        setTotalElements(response.total || 0);
    } catch (error) {
        console.error("Error fetching customer data:", error);
    } finally {
        setLoading(false);
    }
  };

  // Columns with tooltip and actions
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "address",
      headerName: "Address",
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
            onClick={() => handleEditCustomer(params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="secondary"
            onClick={() => handleDeleteCustomer(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  // Filtering
  // useEffect(() => {
  //   const filtered = customersData.filter(
  //     (customer) =>
  //       customer.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
  //       customer.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
  //       customer.phone.toLowerCase().includes(searchFilter.toLowerCase()) ||
  //       customer.city.toLowerCase().includes(searchFilter.toLowerCase())
  //   );
  //   setFilteredData(filtered);
  // }, [searchFilter, customersData]);

  // Snackbar close
  const handleCloseSnackbar = () => setOpenSnackbar(false);

  // Pagination handler
  const handlePaginationModelChange = (newPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  // Add customer (dummy)
  const handleAddCustomer = () => {
    navigation(navigationUrl)
  };

  // Edit customer (dummy)
  const handleEditCustomer = (customer) => {
    if(access_token){
      navigation(navigationUrl, {state: { customersData: customer}});
    }
  };

  // Delete customer
  const handleDeleteCustomer = (id) => {
    setCustomerToDelete(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
      if (customerToDelete) {
        try {
          const data = { customer_id: customerToDelete };
          await CustomerServices.deleteCustomerDataFromId(data);  // wait for API delete
          
          // Remove deleted customer from local state immediately
          setCustomersData((prevData) =>
            prevData.filter((customer) => customer.id !== customerToDelete)
          );

          setSnackbarMessage("Customer deleted successfully!");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
        } catch (error) {
          setSnackbarMessage("Failed to delete customer.",error);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      }
      setOpenDialog(false);
      setCustomerToDelete(null);
    };


  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Customers
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
            rows={customersData}
            columns={columns}
            paginationMode="server"
            paginationModel={paginationModel}
            rowCount={totalElements}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
          />
        </Paper>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Confirmation"
        message="Are you sure you want to delete this customer?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
  );
};

export default Customers;
