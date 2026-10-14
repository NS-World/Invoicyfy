import { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, Paper, TextField, Typography } from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import UndoIcon from "@mui/icons-material/Undo";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import ListExport from "../../components/common/ListExport";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useServerTable from "../../hooks/useServerTable";
import { OnlineServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, datePresets, formatCurrency, formatDate, today } from "../../utils/format";

/** Swiggy / Zomato / own-website orders in one place: sales, commission, payouts received and pending. */
export default function OnlineOrders() {
  const t = useT();
  const notify = useNotify();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [platform, setPlatform] = useState("");
  const [settled, setSettled] = useState("");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const [selected, setSelected] = useState([]);
  const [settle, setSettle] = useState(null);
  const table = useServerTable((p, s, q, f) => OnlineServices.list(p, s, q, f), { idField: "invoice_id", pageSize: 50, filters: { store_id: storeId, platform, settled, ...range } });
  const summary = table.response?.summary || [];
  const platforms = table.response?.platforms || [];
  const chosen = table.rows.filter((r) => selected.includes(r.invoice_id));

  const columns = useMemo(
    () => [
      { field: "invoice_date", headerName: "Date", minWidth: 115, valueFormatter: (v) => formatDate(v) },
      { field: "platform", headerName: "Platform", minWidth: 110, renderCell: ({ value }) => <Chip size="small" label={value} color={value === "Swiggy" ? "warning" : value === "Zomato" ? "error" : "default"} /> },
      { field: "channel_order_id", headerName: "Order no.", minWidth: 120, valueFormatter: (v) => v || "—" },
      { field: "invoice_number", headerName: "Bill", minWidth: 110 },
      { field: "total_amount", headerName: "Sale", minWidth: 100, type: "number", valueFormatter: (v) => formatCurrency(v) },
      { field: "channel_commission", headerName: "Commission", minWidth: 110, type: "number", valueFormatter: (v) => formatCurrency(v) },
      { field: "expected", headerName: "Payout", minWidth: 100, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
      {
        field: "settled_at",
        headerName: "Received",
        minWidth: 190,
        renderCell: ({ row }) =>
          row.settled_at ? <Chip size="small" color="success" label={`${formatCurrency(row.settled_amount)} · ${formatDate(row.settled_at, "short")}`} /> : <Chip size="small" variant="outlined" label={t("Pending")} />,
      },
    ],
    [t]
  );

  const doSettle = async (undo = false) => {
    try {
      const res = await OnlineServices.settle(undo ? { invoice_ids: selected, undo: true } : { invoice_ids: selected, settled_at: settle.date, amount_received: settle.amount === "" ? undefined : Number(settle.amount) });
      notify(t(res.message));
      setSettle(null);
      setSelected([]);
      table.reload();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Online orders"
        subtitle="Swiggy, Zomato and other platforms: sales, commission and payouts"
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("invoices", "add") && (
              <Button variant="contained" onClick={() => navigate("/invoices/new")}>
                {t("Bill an online order")}
              </Button>
            )}
          </>
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {summary.length === 0 && (
          <Grid size={12}>
            <Alert severity="info">{t("No online orders in this period. In Quick Bill choose the platform (Swiggy / Zomato) and type its order number; the bill is kept here.")}</Alert>
          </Grid>
        )}
        {summary.map((s) => (
          <Grid key={s.platform} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, cursor: "pointer" }} onClick={() => setPlatform(s.platform === platform ? "" : s.platform)}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{s.platform}</Typography>
                <Typography color="text.secondary">
                  {s.orders} {t("orders")}
                </Typography>
              </Box>
              {[
                ["Sales", s.sales],
                ["Commission", s.commission],
                ["Expected payout", s.expected],
                ["Received", s.received],
              ].map(([k, v]) => (
                <Box key={k} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    {t(k)}
                  </Typography>
                  <Typography variant="body2">{formatCurrency(v)}</Typography>
                </Box>
              ))}
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t("Payout pending")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: s.pending > 0 ? "error.main" : "success.main" }}>
                  {formatCurrency(s.pending)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search order no. or bill")} />
        <TextField select label={t("Platform")} value={platform} onChange={(e) => setPlatform(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          {platforms.map((p) => (
            <MenuItem key={p.name} value={p.name}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label={t("Payout")} value={settled} onChange={(e) => setSettled(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          <MenuItem value="no">{t("Pending")}</MenuItem>
          <MenuItem value="yes">{t("Received")}</MenuItem>
        </TextField>
        <DateRangeFilter value={range} onChange={setRange} />
        <ListExport
          table={table}
          title={t("Online orders")}
          filename="online-orders"
          subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
          columns={[
            { label: "Date", key: "invoice_date", type: "date" },
            { label: "Platform", key: "platform" },
            { label: "Order no.", key: "channel_order_id" },
            { label: "Bill", key: "invoice_number" },
            { label: "Sale", key: "total_amount", type: "money" },
            { label: "Commission", key: "channel_commission", type: "money" },
            { label: "Payout", key: "expected", type: "money" },
            { label: "Received", key: "settled_amount", type: "money" },
            { label: "Received on", key: "settled_at", type: "date" },
          ]}
        />
      </Toolbar>
      {selected.length > 0 && can("invoices", "edit") && (
        <Alert
          severity="info"
          sx={{ mb: 1 }}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" startIcon={<UndoIcon />} onClick={() => doSettle(true)}>
                {t("Not received")}
              </Button>
              <Button size="small" variant="contained" startIcon={<DoneAllIcon />} onClick={() => setSettle({ date: today(), amount: "" })}>
                {t("Payout received")}
              </Button>
            </Box>
          }
        >
          {t("{n} order(s) selected · payout {amount}", { n: selected.length, amount: formatCurrency(chosen.reduce((s, r) => s + r.expected, 0)) })}
        </Alert>
      )}
      <DataTable
        table={table}
        columns={columns}
        checkboxSelection={can("invoices", "edit")}
        rowSelectionModel={{ type: "include", ids: new Set(selected) }}
        onRowSelectionModelChange={(m) => setSelected(m?.ids ? [...m.ids] : Array.isArray(m) ? m : [])}
        onRowClick={(p) => navigate(`/invoices/${p.row.invoice_id}`)}
        mobileHidden={["invoice_number", "channel_commission"]}
      />
      {settle && (
        <Dialog open onClose={() => setSettle(null)} fullWidth maxWidth="xs">
          <DialogTitle>{t("Payout received")}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {t("{n} order(s). Expected payout {amount}. Enter what the platform actually paid (leave empty to use the expected amount); the difference is counted as commission.", {
                n: selected.length,
                amount: formatCurrency(chosen.reduce((s, r) => s + r.expected, 0)),
              })}
            </Typography>
            <TextField fullWidth type="number" label={t("Amount received")} value={settle.amount} onChange={(e) => setSettle({ ...settle, amount: e.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} sx={{ mb: 2 }} />
            <TextField fullWidth type="date" label={t("Received on")} value={settle.date} onChange={(e) => setSettle({ ...settle, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettle(null)}>{t("Cancel")}</Button>
            <Button variant="contained" onClick={() => doSettle(false)}>
              {t("Save")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
