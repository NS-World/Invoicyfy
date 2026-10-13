import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import StarsIcon from "@mui/icons-material/Stars";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useServerTable from "../../hooks/useServerTable";
import { CouponServices, LoyaltyServices } from "../../services/V3Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import CouponDialog from "./CouponDialog";

const STATE_COLOR = { Active: "success", Scheduled: "info", Expired: "default", "Used up": "warning", Off: "default" };

function CouponUses({ couponId, onClose }) {
  const t = useT();
  const [c, setC] = useState(null);
  useEffect(() => {
    CouponServices.get(couponId).then((r) => setC(r.data)).catch(() => {});
  }, [couponId]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t("Coupon")} {c?.code}
      </DialogTitle>
      <DialogContent dividers>
        {!c ? null : (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("Used")} <b>{c.used_count}</b> {t("time(s)")} · {t("Discount given")} <b>{formatCurrency(c.total_discount)}</b>
            </Typography>
            {c.redemptions.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                {t("Not used yet")}
              </Typography>
            )}
            {c.redemptions.map((r) => (
              <Box key={r.redemption_id} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderTop: 1, borderColor: "divider", gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t("Bill")} {r.invoice_number} · {r.customer_name || t("Walk-in")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(r.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    −{formatCurrency(r.discount)}
                  </Typography>
                  {r.status !== "Used" && <Chip size="small" label={t("Returned (bill cancelled)")} />}
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

function CouponsTab({ storeId }) {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [source, setSource] = useState("");
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [uses, setUses] = useState(null);
  const table = useServerTable((p, s, q, f) => CouponServices.list(p, s, q, f), { idField: "coupon_id", pageSize: 25, filters: { store_id: storeId, source } });

  const columns = useMemo(
    () => [
      {
        field: "code",
        headerName: "Code",
        minWidth: 150,
        flex: 1,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <b>{p.value}</b>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(p.value);
                notify(t("Copied"));
              }}
              aria-label={t("Copy")}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ),
      },
      {
        field: "value",
        headerName: "Discount",
        width: 150,
        valueGetter: (v, r) =>
          r.discount_type === "percent" ? `${formatNumber(v)}%${r.max_discount ? ` (max ${formatCurrency(r.max_discount)})` : ""}` : formatCurrency(v),
      },
      { field: "min_bill", headerName: "Min bill", width: 100, valueFormatter: (v) => (Number(v) > 0 ? formatCurrency(v) : "—") },
      {
        field: "valid_to",
        headerName: "Valid",
        width: 170,
        valueGetter: (v, r) => (r.valid_from || r.valid_to ? `${r.valid_from ? formatDate(r.valid_from, "short") : "…"} – ${r.valid_to ? formatDate(r.valid_to, "short") : "…"}` : t("Always")),
      },
      { field: "used_count", headerName: "Used", width: 90, valueGetter: (v, r) => `${v}${r.usage_limit ? ` / ${r.usage_limit}` : ""}` },
      { field: "customer_name", headerName: "For", width: 140, valueFormatter: (v) => v || t("Everyone") },
      { field: "state", headerName: "Status", width: 110, renderCell: (p) => <Chip size="small" color={STATE_COLOR[p.value]} label={t(p.value)} /> },
      {
        field: "actions",
        headerName: "",
        width: 96,
        sortable: false,
        renderCell: (p) => (
          <>
            {can("loyalty", "edit") && (
              <Tooltip title={t("Edit")}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialog({ coupon: p.row });
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can("loyalty", "delete") && (
              <Tooltip title={t("Delete")}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToDelete(p.row);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ),
      },
    ],
    [can, t, notify]
  );

  const remove = async () => {
    try {
      const res = await CouponServices.remove(toDelete.coupon_id);
      notify(t(res.message));
      table.reload();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setToDelete(null);
  };

  return (
    <>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search code or customer")} />
        <TextField select size="small" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 170 }} label={t("Type")}>
          <MenuItem value="">{t("All coupons")}</MenuItem>
          <MenuItem value="manual">{t("Made by you")}</MenuItem>
          <MenuItem value="birthday">{t("Birthday wishes")}</MenuItem>
          <MenuItem value="anniversary">{t("Anniversary wishes")}</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        {can("loyalty", "add") && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ coupon: null })} data-tour="coupon-add">
            {t("New coupon")}
          </Button>
        )}
      </Toolbar>
      <DataTable table={table} columns={columns} onRowClick={(p) => setUses(p.row.coupon_id)} mobileHidden={["min_bill", "valid_to", "customer_name"]} />
      {dialog && (
        <CouponDialog
          coupon={dialog.coupon}
          storeId={storeId}
          onClose={() => setDialog(null)}
          onSaved={(res) => {
            setDialog(null);
            notify(t(res.message));
            table.reload();
          }}
        />
      )}
      {uses && <CouponUses couponId={uses} onClose={() => setUses(null)} />}
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t("Delete coupon?")}
        message={toDelete ? t("{code}: if it was used on bills it will only be switched off.", { code: toDelete.code }) : ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}

function LoyaltyTab({ storeId }) {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    LoyaltyServices.settings(storeId)
      .then((r) => {
        setData(r.data);
        setF(r.data.settings);
      })
      .catch((e) => notify(apiError(e), "error"));
  }, [storeId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  if (!f) return null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const example = 500;
  const earn = Math.floor((example / 100) * (Number(f.earn_per_100) || 0));
  const save = async () => {
    setSaving(true);
    try {
      const res = await LoyaltyServices.save({ ...f, store_id: storeId });
      notify(t(res.message));
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  const num = (k, label, props = {}) => (
    <TextField fullWidth type="number" label={label} value={f[k]} onChange={set(k)} disabled={!f.enabled} slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }} {...props} />
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <FormControlLabel
            control={<Switch checked={Boolean(f.enabled)} onChange={(e) => setF((x) => ({ ...x, enabled: e.target.checked }))} />}
            label={<Typography sx={{ fontWeight: 700 }}>{t("Give loyalty points on bills")}</Typography>}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("Customers earn points on every bill (customer must be selected on the bill) and use them as a discount later.")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>{num("earn_per_100", t("Points for every ₹100"))}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {num("point_value", t("Value of 1 point"), { slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0.01, step: "any" } } })}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>{num("min_redeem_points", t("Min points to use"))}</Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              {num("max_redeem_percent", t("Max % of bill by points"), { slotProps: { input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } } })}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>{num("min_bill_to_earn", t("Min bill to earn ₹"))}</Grid>
          </Grid>
          {f.enabled && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t("Example: a ₹{amount} bill earns {points} points = {value} for the next visit.", {
                amount: example,
                points: earn,
                value: formatCurrency(earn * (Number(f.point_value) || 0)),
              })}
            </Alert>
          )}
          {can("loyalty", "edit") && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
              {t("Save")}
            </Button>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Grid container spacing={2}>
          <Grid size={6}>
            <StatCard label="Members with points" value={data.stats.members} icon={<LoyaltyIcon />} />
          </Grid>
          <Grid size={6}>
            <StatCard label="Points held" value={formatNumber(data.stats.points, 0)} hint={formatCurrency(data.stats.value)} icon={<StarsIcon />} color="warning.main" />
          </Grid>
          <Grid size={6}>
            <StatCard label="Earned this month" value={formatNumber(data.stats.earned_this_month, 0)} color="success.main" />
          </Grid>
          <Grid size={6}>
            <StatCard label="Used this month" value={formatNumber(data.stats.redeemed_this_month, 0)} color="error.main" />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {t("See or correct a customer's points from Customers → open the customer.")}
        </Typography>
      </Grid>
    </Grid>
  );
}

/** Coupons & Loyalty: coupon codes (incl. automatic birthday coupons) and loyalty point rules. */
export default function CouponsLoyalty() {
  const t = useT();
  const [storeId, setStoreId] = useStoreId();
  const [tab, setTab] = useState(() => (window.location.hash === "#loyalty" ? "loyalty" : "coupons"));
  return (
    <Box>
      <PageHeader title={t("Coupons & Loyalty")} subtitle={t("Discount codes and reward points that bring customers back")} actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile data-tour="loyalty-tabs">
        <Tab value="coupons" label={t("Coupons")} />
        <Tab value="loyalty" label={t("Loyalty points")} />
      </Tabs>
      {storeId && (tab === "coupons" ? <CouponsTab storeId={storeId} /> : <LoyaltyTab storeId={storeId} />)}
    </Box>
  );
}
