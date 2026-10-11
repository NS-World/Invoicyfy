import { useState } from "react";
import { Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
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
import { ProductServices } from "../../services/ProductServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatCurrency, formatNumber } from "../../utils/format";

export default function Products() {
  const navigate = useNavigate();
  const notify = useNotify();
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
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => navigate(`/product?id=${row.product_id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
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
        title="Products"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/product")}>
            Add Product
          </Button>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Name, SKU, category, HSN" />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
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
        title="Delete product?"
        message={`${toDelete?.name || ""} will be deleted (or marked Inactive if it was already billed).`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
