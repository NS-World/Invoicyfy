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
import { StoreServices } from "../../services/StoreServices";
import { useAuth } from "../../context/useAuth";

const Stores = () => {

  const [storesData, setStoresData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();
  const navigation = useNavigate();
  const access_token = useAuth();
  const navigationUrl = "/store";

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Delete confirmation dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);

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
        const response = await StoreServices.getStoresData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
        );

          const storeList = response?.data || [];

          const rowsWithId = storeList.map((item) => ({
          ...item,
           id: item.store_id,
        }));

         setStoresData(rowsWithId);
         setTotalElements(response.data?.total || 0);
         console.log("---stores data---",storesData);
    } catch (error) {
        console.error("Error fetching Stores data:", error);
    } finally {
        setLoading(false);
    }
  };

  // Columns with tooltip and actions
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "name",
      headerName: "Store Name",
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
      field: "phone",
      headerName: "Phone",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "logo_url",
      headerName: "Logo URL",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "created_at",
      headerName: "Created At",
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
            onClick={() => handleEditStore(params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="secondary"
            onClick={() => handleDeleteStore(params.row.id)}
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

  const handleEditStore = (store) => {
    if(access_token){
      navigation(navigationUrl, {state: { storeData: store}});
    }
  };

  const handleDeleteStore = (id) => {
    setStoreToDelete(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
      if (storeToDelete) {
        try {
          const data = { store_id: storeToDelete };
          await StoreServices.deleteStoreDataFromId(data);  // wait for API delete

          setStoresData((prevData) =>
            prevData.filter((store) => store.id !== storeToDelete)
          );

          setSnackbarMessage("Store deleted successfully!");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
        } catch (error) {
          setSnackbarMessage("Failed to delete Store.",error);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      }
      setOpenDialog(false);
      setStoreToDelete(null);
    };


  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Stores
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
            rows={storesData}
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
        message="Are you sure you want to delete this store?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
  );
};

export default Stores;
