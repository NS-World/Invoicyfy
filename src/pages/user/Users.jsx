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
import { UserServices } from "../../services/UserServices"; // ✅ your API
import { useAuth } from "../../context/useAuth";

const Users = () => {

  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();

  const navigation = useNavigate();
  const access_token = useAuth();

  const navigationUrl = "/user";   // redirect URL for add/edit

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Delete Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const pageSizeOptions = [5, 10, 20];

  useEffect(() => {
    const message = localStorage.getItem("successMessage");
    if (message) {
      setSnackbarMessage(message);
      setSnackbarSeverity("success");
      setOpenSnackbar(true);

      setTimeout(() => {
        setOpenSnackbar(false);
        localStorage.removeItem("successMessage");
      }, 5000);
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(delay);
  }, [searchFilter, paginationModel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await UserServices.getUsersData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
      );
    
      const userList = response?.data || [];

      const rowsWithId = userList.map((item) => ({
        ...item,
        id: item.user_id,      // map backend ID → DataGrid ID
      }));

      setUsersData(rowsWithId);
      setTotalElements(response.data?.total || 0);

    } catch (error) {
      console.error("Error fetching Users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value}><span>{params.value}</span></Tooltip>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value}><span>{params.value}</span></Tooltip>
      ),
    },
    {
      field: "role_name",
      headerName: "Role",
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
      field: "created_at",
      headerName: "Created On",
      flex: 1,
      renderCell: (params) => <Tooltip title={params.value}><span>{params.value}</span></Tooltip>,
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value}><span>{params.value}</span></Tooltip>
      ),
    },
    {
      field: "city",
      headerName: "City",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value}><span>{params.value}</span></Tooltip>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <div>
          <IconButton color="primary" onClick={() => handleEditUser(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>

          <IconButton
            color="secondary"
            onClick={() => handleDeleteUser(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handlePaginationModelChange = (newPaginationModel) =>
    setPaginationModel(newPaginationModel);

  const handleAddUser = () => {
    navigation(navigationUrl);
  };

  const handleEditUser = (user) => {
    if (access_token) {
      navigation(navigationUrl, { state: { userData: user } });
    }
  };

  const handleDeleteUser = (id) => {
    setUserToDelete(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        const data = { user_id: userToDelete };

        await UserServices.deleteUserDataFromId(data);

        setUsersData((prev) => prev.filter((u) => u.id !== userToDelete));

        setSnackbarMessage("User deleted successfully!");
        setSnackbarSeverity("success");
        setOpenSnackbar(true);

      } catch (error) {
        setSnackbarMessage("Failed to delete user.");
        console.log("Users table error", error)
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
    }
    setOpenDialog(false);
    setUserToDelete(null);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Users
      </Typography>

      {/* Snackbar */}
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
        <Button variant="contained" onClick={handleAddUser} startIcon={<AddIcon />}>
          Add User
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
        <Typography sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress />
        </Typography>
      ) : (
        <Paper sx={{ height: 500, width: "100%" }}>
          <DataGrid
            rows={usersData}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Confirmation"
        message="Are you sure you want to delete this user?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
  );
};

export default Users;
