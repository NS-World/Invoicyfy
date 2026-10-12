import { useState } from "react";
import { Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import ListExport from "../../components/common/ListExport";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { ProductServices } from "../../services/ProductServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatCurrency, formatNumber } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Products() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [status, setStatus] = useState("Active");
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q, f) => ProductServices.getProductsData(p, s, q, f), { filters: { status }, idField: "product_id" });

  const confirmDelete = async () => {
    try {
      const res = await ProductServices.deleteProductDataFromId({ product_id: toDelete.product_id });
      notify(res.message);
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    {
      field: "name",
      headerName: "Product",
      minWidth: 180,
      flex: 1.5,
      renderCell: ({ row }) => (
        <Box sx={{ lineHeight: 1.2, py: 0.5 }}>
          <div>{row.name}</div>
          <Typography variant="caption" color="text.secondary">
            {[row.sku, row.category].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      ),
    },
    { field: "hsn_code", headerName: "HSN/SAC", minWidth: 100 },
    { field: "price", headerName: "Price", minWidth: 110, type: "number", valueFormatter: (v) => formatCurrency(v) },
    {
      field: "gst_rate",
      headerName: "GST",
      minWidth: 90,
      valueGetter: (v, row) => `${formatNumber(v)}%${row.price_includes_tax ? " incl." : ""}`,
    },
    {
      field: "stock_qty",
      headerName: "Stock",
      minWidth: 100,
      type: "number",
      renderCell: ({ row }) =>
        row.track_inventory ? (
          <Typography variant="body2" sx={{ lineHeight: "inherit", fontWeight: 600 }} color={row.stock_qty <= row.low_stock_threshold ? "error" : "inherit"}>
            {formatNumber(row.stock_qty, 3)} {row.unit}
          </Typography>
        ) : (
          "—"
        ),
    },
    { field: "status", headerName: "Status", minWidth: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: "store_name", headerName: "Store", minWidth: 120 },
    {
      field: "actions",
      headerName: "",
      minWidth: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          {can("products", "edit") && (
          <Tooltip title={t("Edit")}>
            <IconButton size="small" color="primary" onClick={() => navigate(`/product?id=${row.product_id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
          {can("products", "delete") && (
          <Tooltip title={t("Delete")}>
            <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("Products")}
        actions={
          can("products", "add") && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/product")}>
              {t("Add Product")}
            </Button>
          )
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Name, SKU, category, HSN")} />
        <TextField select label={t("Status")} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          <MenuItem value="Active">{t("Active")}</MenuItem>
          <MenuItem value="Inactive">{t("Inactive")}</MenuItem>
        </TextField>
        <ListExport
          table={table}
          title={t("Products")}
          filename="products"
          columns={[
            { label: "Product", key: "name" },
            { label: "SKU", key: "sku" },
            { label: "Category", key: "category" },
            { label: "HSN/SAC", key: "hsn_code" },
            { label: "Unit", key: "unit" },
            { label: "Price", key: "price", type: "money", total: false },
            { label: "Cost", key: "cost_price", type: "money", total: false },
            { label: "GST %", key: "gst_rate", type: "number" },
            { label: "Price incl. GST", value: (r) => (Number(r.price_includes_tax) ? "Yes" : "No") },
            { label: "Stock", key: "stock_qty", type: "qty", total: false },
            { label: "Status", key: "status" },
          ]}
        />
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["hsn_code", "gst_rate", "status", "store_name"]}
        getRowHeight={() => "auto"}
        onRowClick={({ row }) => navigate(`/product-details?id=${row.product_id}`)}
      />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("Delete product?")}
        message={`${toDelete?.name || ""} will be deleted (or marked Inactive if it was already billed).`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
