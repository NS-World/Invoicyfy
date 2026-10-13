import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/AddCircleOutline";
import RemoveIcon from "@mui/icons-material/RemoveCircleOutline";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import SavingsIcon from "@mui/icons-material/Savings";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import DenominationCounter from "../../components/v3/DenominationCounter";
import { denomTotal } from "../../utils/cash";
import ZReport from "../../components/print/ZReport";
import usePrintJob from "../../components/print/usePrintJob";
import { CashServices } from "../../services/V3Services";
import useServerTable from "../../hooks/useServerTable";
import useStores from "../../hooks/useStores";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, formatTime } from "../../utils/format";
import { formatQty } from "../../utils/weight";

const diffColor = (d) => (Math.abs(d) < 0.01 ? "success.main" : d > 0 ? "warning.main" : "error.main");

function MovementDialog({ session, type, onClose, onDone }) {
  const t = useT();
  const notify = useNotify();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const res = await CashServices.movement({ session_id: session.session_id, type, amount, reason });
      notify(t(res.message));
      onDone(res.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{type === "in" ? t("Pay in (cash added)") : t("Pay out (cash taken)")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          type="number"
          label={t("Amount ₹")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mt: 1 }}
          slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
        />
        <TextField
          fullWidth
          label={t("Reason")}
          placeholder={type === "in" ? t("e.g. Change added") : t("e.g. Milk payment, owner took cash")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !(Number(amount) > 0) || !reason.trim()}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CloseDialog({ session, onClose, onClosed }) {
  const t = useT();
  const notify = useNotify();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [mode, setMode] = useState("notes");
  const [counts, setCounts] = useState({});
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const expected = session.report.expected_cash;
  const counted = mode === "notes" ? denomTotal(counts) : Number(amount) || 0;
  const diff = Math.round((counted - expected) * 100) / 100;
  const ready = mode === "notes" ? Object.values(counts).some((v) => Number(v) > 0) : amount !== "";

  const save = async () => {
    setSaving(true);
    try {
      const res = await CashServices.close({
        session_id: session.session_id,
        counted_cash: mode === "amount" ? Number(amount) : undefined,
        denominations: mode === "notes" ? counts : undefined,
        notes,
      });
      notify(t("Day closed"));
      onClosed(res.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={phone}>
      <DialogTitle>{t("Close the day")}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("Count the cash in the drawer. Expected cash")}: <b>{formatCurrency(expected)}</b>
        </Alert>
        <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v) => v && setMode(v)} sx={{ mb: 2 }}>
          <ToggleButton value="notes">{t("Count notes")}</ToggleButton>
          <ToggleButton value="amount">{t("Enter total")}</ToggleButton>
        </ToggleButtonGroup>
        {mode === "notes" ? (
          <DenominationCounter value={counts} onChange={setCounts} />
        ) : (
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={t("Cash counted ₹")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
          />
        )}
        {ready && (
          <Paper variant="outlined" sx={{ p: 1.5, mt: 2, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Typography>
              {t("Expected")}: <b>{formatCurrency(expected)}</b>
            </Typography>
            <Typography>
              {t("Counted")}: <b>{formatCurrency(counted)}</b>
            </Typography>
            <Typography sx={{ color: diffColor(diff), fontWeight: 800 }}>
              {Math.abs(diff) < 0.01 ? t("Matches ✓") : `${diff > 0 ? t("Excess") : t("Short")} ${formatCurrency(Math.abs(diff))}`}
            </Typography>
          </Paper>
        )}
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={Math.abs(diff) > 100 ? t("Note (required: explain the difference)") : t("Note (optional)")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
          error={ready && Math.abs(diff) > 100 && !notes.trim()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" color="error" startIcon={<LockIcon />} onClick={save} disabled={saving || !ready || (Math.abs(diff) > 100 && !notes.trim())}>
          {t("Close day")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Summary({ session, t }) {
  const r = session.report;
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2, height: "100%" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t("Received by mode")}
          </Typography>
          {(r.payments_by_method || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t("No payments yet")}
            </Typography>
          )}
          {(r.payments_by_method || []).map((m) => (
            <Box key={m.method} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography>
                {m.method} <Typography component="span" variant="caption" color="text.secondary">({m.count})</Typography>
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatCurrency(m.amount)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 700 }}>{t("Total received")}</Typography>
            <Typography sx={{ fontWeight: 800 }}>{formatCurrency(r.received_total)}</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2, height: "100%" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t("Bills")}
          </Typography>
          {[
            [t("Bills made"), `${r.bills.count} · ${formatCurrency(r.bills.total)}`],
            [t("Discounts given"), formatCurrency(r.bills.discount)],
            r.bills.coupon_discount > 0 && [t("Coupons"), formatCurrency(r.bills.coupon_discount)],
            r.bills.loyalty_discount > 0 && [t("Loyalty points"), formatCurrency(r.bills.loyalty_discount)],
            [t("Credit (udhaar) given"), formatCurrency(r.bills.credit_given)],
            [t("Cancelled bills"), `${r.cancelled.count} · ${formatCurrency(r.cancelled.total)}`],
          ]
            .filter(Boolean)
            .map(([l, v]) => (
              <Box key={l} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, gap: 1 }}>
                <Typography variant="body2">{l}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {v}
                </Typography>
              </Box>
            ))}
          {(r.by_order_type || []).length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
              {r.by_order_type.map((o) => (
                <Chip key={o.order_type} size="small" label={`${t(o.order_type)}: ${o.count} · ${formatCurrency(o.total)}`} />
              ))}
            </Box>
          )}
        </Paper>
      </Grid>
      {(r.movements || []).length > 0 && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Pay in / pay out")}
            </Typography>
            {r.movements.map((m) => (
              <Box key={m.movement_id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {m.reason}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(m.created_at)} · {m.user_name}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, color: m.type === "in" ? "success.main" : "error.main", whiteSpace: "nowrap" }}>
                  {m.type === "in" ? "+" : "−"}
                  {formatCurrency(m.amount)}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      )}
      {(r.top_items || []).length > 0 && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Top items")}
            </Typography>
            {r.top_items.map((it) => (
              <Box key={`${it.product_name}${it.unit}`} sx={{ display: "flex", justifyContent: "space-between", py: 0.25, gap: 1 }}>
                <Typography variant="body2" noWrap>
                  {it.product_name} <Typography component="span" variant="caption" color="text.secondary">{formatQty(it.quantity, it.unit)}</Typography>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(it.amount)}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}

function HistoryTab({ storeId, onOpen }) {
  const t = useT();
  const table = useServerTable((p, s, q, f) => CashServices.list(p, s, f), { idField: "session_id", pageSize: 25, filters: { store_id: storeId } });
  const columns = useMemo(
    () => [
      { field: "opened_at", headerName: "Day", width: 130, valueFormatter: (v) => formatDate(v) },
      { field: "opened_by_name", headerName: "Opened by", flex: 1, minWidth: 120 },
      { field: "opening_cash", headerName: "Opening", width: 110, type: "number", valueFormatter: (v) => formatCurrency(v) },
      { field: "received_total", headerName: "Received", width: 120, type: "number", valueFormatter: (v) => formatCurrency(v) },
      { field: "expected_cash", headerName: "Expected cash", width: 130, type: "number", valueFormatter: (v) => (v === null ? "—" : formatCurrency(v)) },
      { field: "counted_cash", headerName: "Counted", width: 120, type: "number", valueFormatter: (v) => (v === null ? "—" : formatCurrency(v)) },
      {
        field: "difference",
        headerName: "Difference",
        width: 120,
        type: "number",
        renderCell: (p) =>
          p.value === null ? "—" : (
            <Typography component="span" sx={{ color: diffColor(p.value), fontWeight: 700 }}>
              {formatCurrency(p.value)}
            </Typography>
          ),
      },
      { field: "status", headerName: "Status", width: 100, renderCell: (p) => <Chip size="small" label={t(p.value)} color={p.value === "Open" ? "success" : "default"} /> },
    ],
    [t]
  );
  return <DataTable table={table} columns={columns} onRowClick={(p) => onOpen(p.row.session_id)} mobileHidden={["opened_by_name", "opening_cash", "received_total"]} />;
}

/** Day close / cash register: open the day, pay in / out, see live cash, close with a count and print the Z report. */
export default function DayClose() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const { stores } = useStores();
  const [storeId, setStoreId] = useStoreId();
  const [tab, setTab] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [openCounts, setOpenCounts] = useState({});
  const [countNotes, setCountNotes] = useState(false);
  const [movement, setMovement] = useState(null);
  const [closing, setClosing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const job = usePrintJob();
  const storeName = stores.find((s) => String(s.store_id) === String(storeId))?.name;

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      setData((await CashServices.current(storeId)).data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setLoading(false);
  }, [storeId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const openDay = async () => {
    try {
      await CashServices.open({ store_id: storeId, opening_cash: countNotes ? denomTotal(openCounts) : Number(opening) || 0, denominations: countNotes ? openCounts : undefined });
      notify(t("Day opened"));
      setOpening("");
      setOpenCounts({});
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  const viewSession = async (id) => {
    try {
      setViewing((await CashServices.get(id)).data);
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  const open = data?.open;
  const r = open?.report;
  const printSession = (s) => {
    setViewing((v) => v || s);
    job.print({ pageSize: localStorage.getItem("receiptWidth") || "80mm", key: s.session_id });
  };
  const printTarget = viewing || open;

  return (
    <Box>
      <PageHeader
        title={t("Day Close")}
        subtitle={t("Open the day, track cash in the drawer and close with a count")}
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            <Button startIcon={<RefreshIcon />} onClick={load}>
              {t("Refresh")}
            </Button>
          </>
        }
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="today" label={t("Today")} />
        <Tab value="history" label={t("History")} />
      </Tabs>

      {tab === "history" && storeId && <HistoryTab storeId={storeId} onOpen={viewSession} />}

      {tab === "today" &&
        (loading && !data ? (
          <Loader />
        ) : !open ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 } }} data-tour="day-open">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t("Open the day")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("Enter the cash kept in the drawer at the start (change). Every cash bill is added to it.")}
                </Typography>
                {data?.require_day_open && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {t("Billing is locked until the day is opened.")}
                  </Alert>
                )}
                {!countNotes ? (
                  <TextField
                    fullWidth
                    type="number"
                    label={t("Opening cash ₹")}
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                  />
                ) : (
                  <DenominationCounter value={openCounts} onChange={setOpenCounts} />
                )}
                <Button size="small" onClick={() => setCountNotes((c) => !c)} sx={{ mt: 1 }}>
                  {countNotes ? t("Enter total instead") : t("Count note by note")}
                </Button>
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" size="large" startIcon={<LockOpenIcon />} onClick={openDay} disabled={!can("cash", "add")} fullWidth>
                    {t("Open day")}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              {data?.last_closed && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t("Last day closed")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(data.last_closed.closed_at)} {formatTime(data.last_closed.closed_at)} · {data.last_closed.closed_by_name}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                    <span>{t("Counted")}</span>
                    <b>{formatCurrency(data.last_closed.counted_cash)}</b>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t("Difference")}</span>
                    <Typography component="b" sx={{ color: diffColor(data.last_closed.difference), fontWeight: 700 }}>
                      {formatCurrency(data.last_closed.difference)}
                    </Typography>
                  </Box>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => viewSession(data.last_closed.session_id)}>
                    {t("View report")}
                  </Button>
                </Paper>
              )}
            </Grid>
          </Grid>
        ) : (
          <>
            <Alert severity="success" icon={<LockOpenIcon />} sx={{ mb: 2 }}>
              {t("Day open since")} {formatDate(open.opened_at)} {formatTime(open.opened_at)} · {open.opened_by_name}
            </Alert>
            <Grid container spacing={2} sx={{ mb: 2 }} data-tour="day-stats">
              <Grid size={{ xs: 6, md: 3 }}>
                <StatCard label="Opening cash" value={formatCurrency(r.opening_cash)} icon={<SavingsIcon />} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <StatCard label="Cash sales" value={formatCurrency(r.cash_sales)} icon={<PaymentsIcon />} color="success.main" />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <StatCard label="Pay in − out" value={formatCurrency(r.pay_in - r.pay_out)} icon={<AccountBalanceWalletIcon />} color="warning.main" />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <StatCard label="Expected in drawer" value={formatCurrency(r.expected_cash)} icon={<ReceiptIcon />} color="primary.main" />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {can("cash", "add") && (
                <>
                  <Button variant="outlined" color="success" startIcon={<AddIcon />} onClick={() => setMovement("in")}>
                    {t("Pay in")}
                  </Button>
                  <Button variant="outlined" color="warning" startIcon={<RemoveIcon />} onClick={() => setMovement("out")}>
                    {t("Pay out")}
                  </Button>
                </>
              )}
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printSession(open)}>
                {t("Print X report")}
              </Button>
              <Box sx={{ flex: 1 }} />
              {can("cash", "edit") && (
                <Button variant="contained" color="error" startIcon={<LockIcon />} onClick={() => setClosing(true)} data-tour="day-close-btn">
                  {t("Close day")}
                </Button>
              )}
            </Box>
            <Summary session={open} t={t} />
          </>
        ))}

      {movement && open && (
        <MovementDialog
          session={open}
          type={movement}
          onClose={() => setMovement(null)}
          onDone={(s) => {
            setMovement(null);
            setData((d) => ({ ...d, open: s }));
          }}
        />
      )}
      {closing && open && (
        <CloseDialog
          session={open}
          onClose={() => setClosing(false)}
          onClosed={(s) => {
            setClosing(false);
            setViewing(s);
            load();
          }}
        />
      )}
      {viewing && !job.printing && (
        <Dialog open onClose={() => setViewing(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {viewing.status === "Closed" ? t("Day closed") : t("Day summary")} — {formatDate(viewing.opened_at)}
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: "action.hover" }}>
            {viewing.status === "Closed" && (
              <Collapse in>
                <Alert severity={Math.abs(viewing.difference) < 0.01 ? "success" : "warning"} sx={{ mb: 2 }}>
                  {t("Expected")} {formatCurrency(viewing.expected_cash)} · {t("Counted")} {formatCurrency(viewing.counted_cash)} ·{" "}
                  {t("Difference")} {formatCurrency(viewing.difference)}
                </Alert>
              </Collapse>
            )}
            <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 2, maxWidth: "100%", overflowX: "auto" }}>
              <ZReport session={viewing} storeName={viewing.store_name || storeName} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewing(null)}>{t("Close")}</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => printSession(viewing)}>
              {t("Print")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {job.render(() => printTarget && <ZReport session={printTarget} storeName={printTarget.store_name || storeName} width={localStorage.getItem("receiptWidth") || "80mm"} />)}
    </Box>
  );
}
