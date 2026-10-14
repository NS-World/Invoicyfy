import { useMemo, useState } from "react";
import { Box, Button, Chip, Grid, IconButton, MenuItem, Paper, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import ListExport from "../../components/common/ListExport";
import StatCard from "../../components/common/StatCard";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useCatalog from "../../hooks/useCatalog";
import useServerTable from "../../hooks/useServerTable";
import { BatchServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { datePresets, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import WastageDialog from "./WastageDialog";

function daysChip(t, d) {
  if (d === null || d === undefined) return <Chip size="small" label={t("No expiry")} />;
  if (d < 0) return <Chip size="small" color="error" label={t("Expired {n} day(s) ago", { n: -d })} />;
  if (d === 0) return <Chip size="small" color="error" label={t("Expires today")} />;
  return <Chip size="small" color={d <= 3 ? "warning" : "default"} label={t("{n} day(s) left", { n: d })} />;
}

function BatchesTab({ storeId, state, onWaste }) {
  const t = useT();
  const { can } = useAuth();
  const [days, setDays] = useState(7);
  const table = useServerTable((p, s, q, f) => BatchServices.list(p, s, q, f), { idField: "batch_id", pageSize: 25, filters: { store_id: storeId, state, days: state === "expiring" ? days : undefined } });
  const columns = useMemo(
    () => [
      { field: "product_name", headerName: "Item", minWidth: 170, flex: 1.3 },
      { field: "batch_no", headerName: "Batch", minWidth: 100, valueFormatter: (v) => v || "—" },
      { field: "expiry_date", headerName: "Expiry", minWidth: 110, valueFormatter: (v) => (v ? formatDate(v) : "—") },
      { field: "days_left", headerName: "Status", minWidth: 185, renderCell: ({ row }) => daysChip(t, row.expiry_date ? row.days_left : null) },
      { field: "qty_left", headerName: "Left", minWidth: 100, type: "number", valueGetter: (v, r) => `${formatNumber(v, 3)} ${r.unit || ""}` },
      { field: "value", headerName: "Value", minWidth: 100, type: "number", valueGetter: (v, r) => formatCurrency(r.qty_left * r.cost) },
      { field: "supplier_name", headerName: "Supplier", minWidth: 140, valueGetter: (v, r) => [v, r.bill_no].filter(Boolean).join(" · ") || "—" },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        renderCell: ({ row }) =>
          can("inventory", "add") && row.qty_left > 0 ? (
            <Tooltip title={t("Wastage from this batch")}>
              <IconButton size="small" color="error" onClick={() => onWaste({ product: { product_id: row.product_id, name: row.product_name, unit: row.unit }, batch_id: row.batch_id, quantity: row.days_left < 0 ? row.qty_left : "", reason: row.days_left < 0 ? "Expired" : "Melted" })}>
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null,
      },
    ],
    [t, can, onWaste]
  );
  return (
    <>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search item or batch")} />
        {state === "expiring" && (
          <TextField select label={t("Expiring within")} value={days} onChange={(e) => setDays(e.target.value)} sx={{ minWidth: 160 }}>
            {[0, 3, 7, 15, 30, 60].map((d) => (
              <MenuItem key={d} value={d}>
                {d === 0 ? t("Today / expired") : t("{n} days", { n: d })}
              </MenuItem>
            ))}
          </TextField>
        )}
        <ListExport
          table={table}
          title={t("Stock batches")}
          filename="batches"
          columns={[
            { label: "Item", key: "product_name" },
            { label: "Batch", key: "batch_no" },
            { label: "Expiry", key: "expiry_date", type: "date" },
            { label: "Received", key: "qty_received", type: "qty" },
            { label: "Left", key: "qty_left", type: "qty" },
            { label: "Unit", key: "unit" },
            { label: "Supplier", key: "supplier_name" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["batch_no", "value", "supplier_name", "expiry_date"]} />
    </>
  );
}

function WastageTab({ storeId, reloadKey }) {
  const t = useT();
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const table = useServerTable((p, s, q, f) => BatchServices.wastage(p, s, q, f), { idField: "movement_id", pageSize: 25, filters: { store_id: storeId, ...range, k: reloadKey } });
  const sum = table.response?.summary;
  const columns = [
    { field: "created_at", headerName: "Date", minWidth: 150, valueFormatter: (v) => formatDate(v, "long") },
    { field: "product_name", headerName: "Item", minWidth: 160, flex: 1 },
    { field: "quantity", headerName: "Qty", minWidth: 90, type: "number", valueGetter: (v, r) => `${formatNumber(v, 3)} ${r.unit || ""}` },
    { field: "notes", headerName: "Reason", minWidth: 180, flex: 1.2 },
    { field: "loss", headerName: "Loss", minWidth: 100, type: "number", renderCell: ({ value }) => <strong style={{ color: "#c62828" }}>{formatCurrency(value)}</strong> },
    { field: "user_name", headerName: "By", minWidth: 110 },
  ];
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Wastage loss in period" value={formatCurrency(sum?.loss || 0)} color="error.main" loading={!table.response} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: "divider", height: "100%" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t("By reason")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {Object.entries(sum?.by_reason || {}).map(([k, v]) => (
                <Chip key={k} label={`${t(k)}: ${formatCurrency(v)}`} variant="outlined" />
              ))}
              {(sum?.by_item || []).slice(0, 3).map((i) => (
                <Chip key={i.product_name} color="warning" variant="outlined" label={`${i.product_name}: ${formatCurrency(i.loss)}`} />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <Toolbar>
        <DateRangeFilter value={range} onChange={setRange} />
        <ListExport
          table={table}
          title={t("Wastage")}
          filename="wastage"
          subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
          columns={[
            { label: "Date", key: "created_at", type: "date" },
            { label: "Item", key: "product_name" },
            { label: "Qty", key: "quantity", type: "qty" },
            { label: "Unit", key: "unit" },
            { label: "Reason", key: "notes" },
            { label: "Cost per unit", key: "unit_cost", type: "money" },
            { label: "Loss", key: "loss", type: "money" },
            { label: "By", key: "user_name" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["user_name", "created_at"]} />
    </>
  );
}

/** Batches with expiry dates, items expiring soon, and wastage (melted / expired / damaged). */
export default function ExpiryWastage() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const catalog = useCatalog(storeId);
  const [tab, setTab] = useState(0);
  const [waste, setWaste] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Expiry & wastage"
        subtitle="Stock with expiry dates is used first-expiry-first"
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("inventory", "add") && (
              <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => setWaste({})}>
                {t("Wastage entry")}
              </Button>
            )}
          </>
        }
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab label={t("Expiring soon")} />
        <Tab label={t("All batches")} />
        <Tab label={t("Wastage")} />
      </Tabs>
      {storeId && tab === 0 && <BatchesTab key={`e${reloadKey}`} storeId={storeId} state="expiring" onWaste={setWaste} />}
      {storeId && tab === 1 && <BatchesTab key={`a${reloadKey}`} storeId={storeId} state="in_stock" onWaste={setWaste} />}
      {storeId && tab === 2 && <WastageTab storeId={storeId} reloadKey={reloadKey} />}
      {waste && (
        <WastageDialog
          products={catalog.products}
          preset={waste.product ? waste : null}
          onClose={() => setWaste(null)}
          onSaved={(res) => {
            setWaste(null);
            notify(t(res.message));
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}
