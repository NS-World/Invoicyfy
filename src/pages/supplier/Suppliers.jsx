import { useMemo, useState } from "react";
import { Box, Button, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import ListExport from "../../components/common/ListExport";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useServerTable from "../../hooks/useServerTable";
import { SupplierServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency } from "../../utils/format";
import SupplierDialog from "./SupplierDialog";
import SupplierPayDialog from "./SupplierPayDialog";
import SupplierStatement from "./SupplierStatement";

export default function Suppliers() {
  const t = useT();
  const notify = useNotify();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [dialog, setDialog] = useState(null);
  const [pay, setPay] = useState(null);
  const [statement, setStatement] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q, f) => SupplierServices.list(p, s, q, f), { idField: "supplier_id", pageSize: 25, filters: { store_id: storeId } });

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Supplier",
        minWidth: 180,
        flex: 1.4,
        renderCell: ({ row }) => (
          <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.name} {!row.is_active && <Chip size="small" label={t("Off")} sx={{ ml: 0.5 }} />}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[row.contact_person, row.phone].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        ),
      },
      { field: "gstin", headerName: "GSTIN", minWidth: 150, valueFormatter: (v) => v || "—" },
      { field: "bills", headerName: "Bills", width: 80, type: "number" },
      { field: "purchased", headerName: "Purchased", minWidth: 120, type: "number", valueFormatter: (v) => formatCurrency(v) },
      { field: "paid", headerName: "Paid", minWidth: 110, type: "number", valueFormatter: (v) => formatCurrency(v) },
      {
        field: "balance",
        headerName: "We owe",
        minWidth: 120,
        type: "number",
        renderCell: ({ value }) => <strong style={{ color: value > 0 ? "#c62828" : "#2e7d32" }}>{formatCurrency(value)}</strong>,
      },
      {
        field: "actions",
        headerName: "",
        minWidth: 150,
        sortable: false,
        renderCell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            {can("purchases", "add") && (
              <Tooltip title={t("Pay supplier")}>
                <IconButton size="small" color="success" onClick={() => setPay(row)}>
                  <PaymentsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t("Statement")}>
              <IconButton size="small" onClick={() => setStatement(row.supplier_id)}>
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {can("purchases", "edit") && (
              <Tooltip title={t("Edit")}>
                <IconButton size="small" color="primary" onClick={() => setDialog({ supplier: row })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can("purchases", "delete") && (
              <Tooltip title={t("Delete")}>
                <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </span>
        ),
      },
    ],
    [can, t]
  );

  const remove = async () => {
    try {
      const res = await SupplierServices.remove(toDelete.supplier_id);
      notify(t(res.message));
      table.reload();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={table.response ? `${t("Total we owe")}: ${formatCurrency(table.response.total_owed)}` : " "}
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("purchases", "view") && (
              <Button variant="outlined" onClick={() => navigate("/purchases")}>
                {t("Purchase bills")}
              </Button>
            )}
            {can("purchases", "add") && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ supplier: null })}>
                {t("New supplier")}
              </Button>
            )}
          </>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search name, mobile or GSTIN")} />
        <ListExport
          table={table}
          title={t("Suppliers")}
          filename="suppliers"
          columns={[
            { label: "Supplier", key: "name" },
            { label: "Contact", key: "contact_person" },
            { label: "Mobile", key: "phone" },
            { label: "GSTIN", key: "gstin" },
            { label: "Opening", key: "opening_balance", type: "money" },
            { label: "Purchased", key: "purchased", type: "money" },
            { label: "Paid", key: "paid", type: "money" },
            { label: "We owe", key: "balance", type: "money" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} onRowClick={(p) => setStatement(p.row.supplier_id)} mobileHidden={["gstin", "bills", "purchased", "paid"]} />
      {dialog && (
        <SupplierDialog
          supplier={dialog.supplier}
          storeId={storeId}
          onClose={() => setDialog(null)}
          onSaved={(res) => {
            setDialog(null);
            notify(t(res.message));
            table.reload();
          }}
        />
      )}
      {pay && (
        <SupplierPayDialog
          supplier={pay}
          onClose={() => setPay(null)}
          onSaved={(res) => {
            setPay(null);
            notify(t(res.message));
            table.reload();
          }}
        />
      )}
      {statement && <SupplierStatement supplierId={statement} onClose={() => setStatement(null)} onChanged={table.reload} />}
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t("Delete supplier?")}
        message={toDelete ? t("{name}: if it has purchase bills it will only be switched off.", { name: toDelete.name }) : ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
