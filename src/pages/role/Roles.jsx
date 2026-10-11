import { useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { RoleServices } from "../../services/RoleServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatDate } from "../../utils/format";

export default function Roles() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q) => RoleServices.getRolesData(p, s, q), { idField: "role_id" });

  const confirmDelete = async () => {
    try {
      await RoleServices.deleteRoleDataFromId({ role_id: toDelete.role_id });
      notify("Role deleted");
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    { field: "role_name", headerName: "Role", minWidth: 160, flex: 1 },
    { field: "created_at", headerName: "Created", minWidth: 130, valueFormatter: (v) => formatDate(v) },
    {
      field: "actions",
      headerName: "",
      minWidth: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <span>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => navigate(`/role?id=${row.role_id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setToDelete(row)} disabled={row.role_name === "Admin"}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/role")}>
            Add Role
          </Button>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Search roles" />
      </Toolbar>
      <DataTable table={table} columns={columns} height={420} />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete role?"
        message={`Role ${toDelete?.role_name || ""} will be deleted.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
