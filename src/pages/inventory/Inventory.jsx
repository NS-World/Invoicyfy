import { useState } from "react";
import { Button, Grid, IconButton, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import AddBoxIcon from "@mui/icons-material/AddBox";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import ListExport from "../../components/common/ListExport";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import StockAdjustDialog from "./StockAdjustDialog";
import StockHistoryDialog from "./StockHistoryDialog";
import { InventoryServices } from "../../services/InventoryServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { formatCurrency, formatNumber } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Inventory() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [filter, setFilter] = useState("");
  const [adjust, setAdjust] = useState(null);
  const [history, setHistory] = useState(null);
  const table = useServerTable((p, s, q, f) => InventoryServices.getStock(p, s, q, f), { filters: { filter }, idField: "product_id", pageSize: 25 });
  const summary = table.response?.summary;

  const columns = [
    { field: "name", headerName: "Product", minWidth: 180, flex: 1.5 },
    { field: "category", headerName: "Category", minWidth: 120, flex: 1 },
    {
      field: "stock_qty",
      headerName: "In Stock",
      minWidth: 110,
      type: "number",
      renderCell: ({ row }) => {
        const color = row.stock_qty <= 0 ? "error" : row.stock_qty <= row.low_stock_threshold ? "warning.main" : "text.primary";
        return (
          <Typography variant="body2" color={color} sx={{ fontWeight: 700, lineHeight: "inherit" }}>
            {formatNumber(row.stock_qty, 3)} {row.unit}
          </Typography>
        );
      },
    },
    { field: "low_stock_threshold", headerName: "Reorder At", minWidth: 100, type: "number", valueFormatter: (v) => formatNumber(v, 3) },
    { field: "cost_price", headerName: "Cost", minWidth: 100, type: "number", valueFormatter: (v) => formatCurrency(v) },
    { field: "stock_value", headerName: "Stock Value", minWidth: 120, type: "number", valueFormatter: (v) => formatCurrency(v) },
    {
      field: "actions",
      headerName: "",
      minWidth: 100,
      sortable: false,
      renderCell: ({ row }) => (
        <span>
          {can("inventory", "add") && (
          <Tooltip title={t("Stock in / out")}>
            <IconButton size="small" color="primary" onClick={() => setAdjust(row)}>
              <AddBoxIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
          <Tooltip title={t("History")}>
            <IconButton size="small" onClick={() => setHistory(row)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("Inventory")}
        actions={
          can("products", "add") && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/product")}>
              {t("Add Product")}
            </Button>
          )
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Products tracked")} value={summary?.products ?? "-"} loading={!summary} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Low stock")} value={summary?.low_stock ?? "-"} color="warning.main" loading={!summary} onClick={() => setFilter("low")} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Out of stock")} value={summary?.out_of_stock ?? "-"} color="error.main" loading={!summary} onClick={() => setFilter("out")} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Stock value (cost)")} value={formatCurrency(summary?.stock_value_cost)} hint={summary ? `Sale value ${formatCurrency(summary.stock_value_sale)}` : ""} loading={!summary} />
        </Grid>
      </Grid>
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" sx={{ mb: 1 }}>
        <Tab value="" label={t("All")} />
        <Tab value="low" label={t("Low stock")} />
        <Tab value="out" label={t("Out of stock")} />
      </Tabs>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search product, SKU, category")} />
        <ListExport
          table={table}
          title={t("Stock Report")}
          filename="stock"
          columns={[
            { label: "Product", key: "name" },
            { label: "SKU", key: "sku" },
            { label: "Category", key: "category" },
            { label: "Unit", key: "unit" },
            { label: "In stock", key: "stock_qty", type: "qty", total: false },
            { label: "Reorder at", key: "low_stock_threshold", type: "qty", total: false },
            { label: "Cost", key: "cost_price", type: "money", total: false },
            { label: "Stock value", key: "stock_value", type: "money" },
            { label: "Last movement", key: "last_movement_at" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["category", "low_stock_threshold", "cost_price", "stock_value"]} />
      <StockAdjustDialog
        product={adjust}
        open={Boolean(adjust)}
        onClose={() => setAdjust(null)}
        onSaved={(res) => {
          setAdjust(null);
          notify(res.message);
          table.reload();
        }}
      />
      <StockHistoryDialog product={history} open={Boolean(history)} onClose={() => setHistory(null)} />
    </>
  );
}
