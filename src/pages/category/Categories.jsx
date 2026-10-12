import { useMemo, useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { CategoryServices } from "../../services/CategoryServices";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import useServerTable from "../../hooks/useServerTable";
import { apiError } from "../../utils/format";
import { gramsLabel, parsePresets, isWeightUnit } from "../../utils/weight";
import CategoryDialog from "./CategoryDialog";

export default function Categories() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [dialog, setDialog] = useState(null); // { category } | { category: null }
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q) => CategoryServices.list(p, s, q), { idField: "category_id", pageSize: 25 });

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Category", flex: 1.2, minWidth: 160 },
      { field: "default_unit", headerName: "Default unit", width: 120 },
      { field: "gst_rate", headerName: "GST %", width: 90, valueFormatter: (v) => (v === null || v === undefined ? "—" : `${v}%`) },
      {
        field: "weight_presets",
        headerName: "Quick sizes",
        flex: 1,
        minWidth: 160,
        sortable: false,
        valueGetter: (v, row) => (isWeightUnit(row.default_unit) ? parsePresets(v).map((g) => gramsLabel(g, row.default_unit)).join(", ") : "—"),
      },
      { field: "product_count", headerName: "Products", width: 100, type: "number" },
      { field: "is_active", headerName: "Status", width: 110, renderCell: (p) => <StatusChip status={p.value ? "Active" : "Inactive"} /> },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        renderCell: (p) => (
          <>
            {can("products", "edit") && (
              <Tooltip title={t("Edit")}>
                <IconButton size="small" onClick={() => setDialog({ category: p.row })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can("products", "delete") && (
              <Tooltip title={t("Delete")}>
                <IconButton size="small" color="error" onClick={() => setToDelete(p.row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [can, t]
  );

  const remove = async () => {
    try {
      await CategoryServices.remove(toDelete.category_id);
      notify(t("Category deleted"));
      table.reload();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setToDelete(null);
  };

  return (
    <>
      <PageHeader
        title={t("Categories")}
        subtitle={t("Group products and set their default unit (kg, ltr, pcs...)")}
        actions={
          can("products", "add") && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ category: null })}>
              {t("Add Category")}
            </Button>
          )
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search categories")} />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["gst_rate", "weight_presets", "is_active"]} />
      {dialog && (
        <CategoryDialog
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            notify(t("Category saved"));
            table.reload();
          }}
        />
      )}
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t("Delete category?")}
        message={toDelete ? `${toDelete.name}` : ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
