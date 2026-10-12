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
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { UserServices } from "../../services/UserServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatDate } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Users() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q) => UserServices.getUsersData(p, s, q), { idField: "user_id" });

  const confirmDelete = async () => {
    try {
      const res = await UserServices.deleteUserDataFromId({ user_id: toDelete.user_id });
      notify(res.message);
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    { field: "name", headerName: "Name", minWidth: 150, flex: 1 },
    { field: "email", headerName: "Email", minWidth: 190, flex: 1.2 },
    { field: "phone", headerName: "Phone", minWidth: 120 },
    { field: "role_name", headerName: "Role", minWidth: 100 },
    { field: "store_name", headerName: "Store", minWidth: 130 },
    { field: "is_active", headerName: "Status", minWidth: 100, renderCell: ({ value }) => <StatusChip status={Number(value) ? "Active" : "Inactive"} /> },
    { field: "last_login_at", headerName: "Last login", minWidth: 120, valueFormatter: (v) => (v ? formatDate(v) : "Never") },
    {
      field: "actions",
      headerName: "",
      minWidth: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip title={t("Edit")}>
            <IconButton size="small" color="primary" onClick={() => navigate(`/user?id=${row.user_id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Delete")}>
            <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
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
        title={t("Users")}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/user")}>
            {t("Add User")}
          </Button>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Name, email, phone")} />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["email", "phone", "store_name", "last_login_at"]} onRowClick={({ row }) => navigate(`/user?id=${row.user_id}`)} />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("Delete user?")}
        message={`${toDelete?.name || ""} will be deleted (or disabled if they have billing history).`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
