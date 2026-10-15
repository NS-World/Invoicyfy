import { useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import AddBoxIcon from "@mui/icons-material/AddBox";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteRelatedDialog from "../../components/common/DeleteRelatedDialog";
import AddInventoryDialog from "./AddInventoryDialog";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { ProductServices } from "../../services/ProductServices";
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
import { apiError, formatCurrency, formatNumber } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Inventory() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [filter, setFilter] = useState("");
  const [adjust, setAdjust] = useState(null);
  const [history, setHistory] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [trackDlg, setTrackDlg] = useState(null); // { product, opening } or { all: true }
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // "Track stock" on / off — the same switch as on the product form.
  const saveTracking = async (body) => {
    setBusy(true);
    try {
      const res = await InventoryServices.setTracking(body);
      notify(t(res.message));
      setTrackDlg(null);
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setBusy(false);
  };

  const table = useServerTable((p, s, q, f) => InventoryServices.getStock(p, s, q, f), { filters: { filter }, idField: "product_id", pageSize: 25 });
  const summary = table.response?.summary;

  const columns = [
    {
      field: "name",
      headerName: "Product",
      minWidth: 180,
      flex: 1.5,
      renderCell: ({ row }) => (
        <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
          {row.sku && (
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              {row.sku}
            </Typography>
          )}
        </Box>
      ),
    },
    { field: "category", headerName: "Category", minWidth: 120, flex: 1 },
    {
      field: "stock_qty",
      headerName: "In Stock",
      minWidth: 135,
      type: "number",
      renderCell: ({ row }) => {
        if (!row.track_inventory)
          return can("inventory", "add") ? (
            <Tooltip title={t("Stock is not counted for this product. Click to start tracking.")}>
              <Chip size="small" variant="outlined" icon={<TrackChangesIcon />} label={t("Not tracked")} onClick={() => setTrackDlg({ product: row, opening: "" })} />
            </Tooltip>
          ) : (
            <Chip size="small" variant="outlined" label={t("Not tracked")} />
          );
        const color = row.stock_qty <= 0 ? "error" : row.stock_qty <= row.low_stock_threshold ? "warning.main" : "text.primary";
        return (
          <Typography variant="body2" color={color} sx={{ fontWeight: 700, lineHeight: "inherit" }}>
            {formatNumber(row.stock_qty, 3)} {row.unit}
          </Typography>
        );
      },
    },
    { field: "low_stock_threshold", headerName: "Reorder At", minWidth: 100, type: "number", valueGetter: (v, r) => (r.track_inventory ? formatNumber(v, 3) : "—") },
    { field: "price", headerName: "Price", minWidth: 100, type: "number", valueFormatter: (v) => formatCurrency(v) },
    { field: "cost_price", headerName: "Cost", minWidth: 100, type: "number", valueFormatter: (v) => formatCurrency(v) },
    { field: "stock_value", headerName: "Stock Value", minWidth: 120, type: "number", valueGetter: (v, r) => (r.track_inventory ? formatCurrency(v) : "—") },
    {
      field: "actions",
      headerName: "",
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <span>
          {can("products", "edit") && (
            <Tooltip title={t("Edit")}>
              <IconButton size="small" color="primary" onClick={() => navigate(`/product?id=${row.product_id}&back=inventory`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {can("inventory", "add") && (
          <Tooltip title={t("Stock in / out")}>
            <IconButton size="small" color="primary" onClick={() => setAdjust(row)}>
              <AddBoxIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
          {can("inventory", "add") && row.track_inventory === 1 && (
            <Tooltip title={t("Stop tracking stock")}>
              <IconButton size="small" onClick={() => saveTracking({ product_ids: [row.product_id], track: false })}>
                <TrackChangesIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t("History")}>
            <IconButton size="small" onClick={() => setHistory(row)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
        title={t("Inventory")}
        actions={
          <>
            {can("inventory", "add") && (
              <Button variant="contained" color="success" startIcon={<PlaylistAddIcon />} onClick={() => setAddOpen(true)} data-tour="add-inventory">
                {t("Add inventory")}
              </Button>
            )}
            {can("products", "add") && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/product?back=inventory")}>
                {t("Add Product")}
              </Button>
            )}
          </>
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label={t("Products")}
            value={summary?.all_products ?? "-"}
            hint={summary ? `${summary.products} ${t("stock tracked")} · ${summary.untracked} ${t("not tracked")}` : ""}
            loading={!summary}
            onClick={() => setFilter("")}
          />
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
      {summary?.untracked > 0 && can("inventory", "add") && (
        <Alert
          severity="info"
          sx={{ mb: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => setTrackDlg({ all: true })}>
              {t("Track all")}
            </Button>
          }
        >
          {t("{n} product(s) have \"Track stock\" off, so their stock is not counted. Turn it on for items you want to count (tubs, cones, packs).", { n: summary.untracked })}
        </Alert>
      )}
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 1 }} data-tour="inventory-tabs">
        <Tab value="" label={t("All")} />
        <Tab value="tracked" label={t("Stock tracked")} />
        <Tab value="untracked" label={t("Not tracked")} />
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
            { label: "Track stock", value: (r) => (r.track_inventory ? "Yes" : "No") },
            { label: "In stock", key: "stock_qty", type: "qty", total: false },
            { label: "Reorder at", key: "low_stock_threshold", type: "qty", total: false },
            { label: "Cost", key: "cost_price", type: "money", total: false },
            { label: "Stock value", key: "stock_value", type: "money" },
            { label: "Last movement", key: "last_movement_at" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["category", "low_stock_threshold", "cost_price", "price", "stock_value"]} />
      {trackDlg && (
        <Dialog open onClose={() => setTrackDlg(null)} fullWidth maxWidth="xs">
          <DialogTitle>{trackDlg.all ? t("Track stock for all products?") : `${t("Start tracking stock")}: ${trackDlg.product.name}`}</DialogTitle>
          <DialogContent dividers>
            {trackDlg.all ? (
              <Typography variant="body2">
                {t("Stock will be counted for {n} product(s), starting at 0. Then use Stock in (or a purchase bill) to add what you have now.", { n: summary?.untracked || 0 })}
              </Typography>
            ) : (
              <TextField
                fullWidth
                autoFocus
                type="number"
                label={t("Stock you have now")}
                value={trackDlg.opening}
                onChange={(e) => setTrackDlg({ ...trackDlg, opening: e.target.value })}
                helperText={t("Leave empty to start at 0")}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">{trackDlg.product.unit}</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTrackDlg(null)}>{t("Cancel")}</Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={() =>
                saveTracking(
                  trackDlg.all
                    ? { all_untracked: true, track: true }
                    : { product_ids: [trackDlg.product.product_id], track: true, opening_stock: trackDlg.opening === "" ? undefined : Number(trackDlg.opening) }
                )
              }
            >
              {t("Start tracking")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
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
      <AddInventoryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => table.reload()}
      />
      <DeleteRelatedDialog
        open={Boolean(toDelete)}
        title="Delete product?"
        name={toDelete?.name}
        preview={() => ProductServices.deleteProductDataFromId({ product_id: toDelete.product_id, preview: true })}
        remove={() => ProductServices.deleteProductDataFromId({ product_id: toDelete.product_id })}
        onClose={() => setToDelete(null)}
        onDeleted={(res) => {
          notify(res.message);
          setToDelete(null);
          table.reload();
        }}
      />
    </>
  );
}
