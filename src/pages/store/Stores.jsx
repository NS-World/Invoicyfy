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
import { StoreServices } from "../../services/StoreServices";
import { clearStoreCache } from "../../hooks/useStores";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Stores() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q) => StoreServices.getStoresData(p, s, q), { idField: "store_id" });

  const confirmDelete = async () => {
    try {
      await StoreServices.deleteStoreDataFromId({ store_id: toDelete.store_id });
      clearStoreCache();
      notify(t("Store deleted"));
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    { field: "name", headerName: "Store", minWidth: 180, flex: 1.2 },
    { field: "gstin", headerName: "GSTIN", minWidth: 160 },
    { field: "city", headerName: "City", minWidth: 120 },
    { field: "state", headerName: "State", minWidth: 120 },
    { field: "phone", headerName: "Phone", minWidth: 120 },
    { field: "invoice_prefix", headerName: "Prefix", minWidth: 80 },
    {
      field: "actions",
      headerName: "",
      minWidth: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip title={t("Edit")}>
            <IconButton size="small" color="primary" onClick={() => navigate(`/store?id=${row.store_id}`)}>
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
        title={t("Stores")}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/store")}>
            {t("Add Store")}
          </Button>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Name, city, GSTIN")} />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["state", "phone", "invoice_prefix", "city"]} onRowClick={({ row }) => navigate(`/store?id=${row.store_id}`)} />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("Delete store?")}
        message={`${toDelete?.name || ""} will be deleted.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
