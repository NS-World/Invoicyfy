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
import { RoleServices } from "../../services/RoleServices";
import { useAuth } from "../../context/useAuth";

const Roles = () => {

  const [rolesData, setRolesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState();
  const navigation = useNavigate();
  const access_token = useAuth();
  const navigationUrl = "/role";

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Delete confirmation dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

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
        const response = await RoleServices.getRolesData(
        paginationModel.page,
        paginationModel.pageSize,
        searchFilter
        );

          const roleList = response?.data || [];

          const rowsWithId = roleList.map((item) => ({
          ...item,
           id: item.role_id,
        }));

         setRolesData(rowsWithId);
         setTotalElements(response.data?.total || 0);
         console.log("---roles data---",rolesData);
    } catch (error) {
        console.error("Error fetching Roles data:", error);
    } finally {
        setLoading(false);
    }
  };

  // Columns with tooltip and actions
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "role_name",
      headerName: "Role Name",
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
            onClick={() => handleEditRole(params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="secondary"
            onClick={() => handleDeleteRole(params.row.id)}
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

  const handleEditRole = (role) => {
    if(access_token){
      navigation(navigationUrl, {state: { roleData: role}});
    }
  };

  const handleDeleteRole = (id) => {
    setRoleToDelete(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
      if (roleToDelete) {
        try {
          const data = { role_id: roleToDelete };
          await RoleServices.deleteRoleDataFromId(data);  // wait for API delete
          
          setRolesData((prevData) =>
            prevData.filter((role) => role.id !== roleToDelete)
          );

          setSnackbarMessage("Role deleted successfully!");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
        } catch (error) {
          setSnackbarMessage("Failed to delete Role.",error);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      }
      setOpenDialog(false);
      setRoleToDelete(null);
    };


  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Roles
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
            rows={rolesData}
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
        message="Are you sure you want to delete this role?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Box>
  );
};

export default Roles;
