import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useCatalog from "../../hooks/useCatalog";
import { PurchaseServices, SupplierServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, today } from "../../utils/format";
import SupplierDialog from "../supplier/SupplierDialog";
import { PAY_METHODS } from "../../utils/v4";

const GST_RATES = [0, 5, 12, 18, 28];
const blankLine = () => ({ key: Math.random(), product: null, quantity: "", unit_cost: "", gst_rate: 0, discount_amount: "", batch_no: "", expiry_date: "" });
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/** New purchase bill: supplier, items (with optional batch + expiry), other charges and amount paid now. */
export default function PurchaseForm() {
  const t = useT();
  const notify = useNotify();
  const navigate = useNavigate();
  const [storeId, setStoreId] = useStoreId();
  const catalog = useCatalog(storeId);
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState(false);
  const [head, setHead] = useState({ bill_no: "", purchase_date: today(), due_date: "", notes: "", other_charges: "" });
  const [lines, setLines] = useState([blankLine()]);
  const [pay, setPay] = useState({ amount: "", payment_method: "Cash", reference_no: "" });
  const [updateCost, setUpdateCost] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = (selectId) =>
    SupplierServices.list(0, 500, "", { store_id: storeId, active: 1 })
      .then((r) => {
        setSuppliers(r.data || []);
        if (selectId) setSupplier((r.data || []).find((s) => s.supplier_id === selectId) || null);
      })
      .catch(() => {});
  useEffect(() => {
    if (storeId) loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const pickProduct = (i, p) =>
    setLine(i, p ? { product: p, unit_cost: p.cost_price > 0 ? String(p.cost_price) : "", gst_rate: Number(p.gst_rate) || 0 } : { product: null });

  const totals = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    lines.forEach((l) => {
      const net = r2(Number(l.quantity) * Number(l.unit_cost)) - (Number(l.discount_amount) || 0);
      if (!(net > 0)) return;
      taxable += net;
      tax += r2((net * Number(l.gst_rate)) / 100);
    });
    const exact = r2(taxable + tax + (Number(head.other_charges) || 0));
    return { taxable: r2(taxable), tax: r2(tax), total: Math.round(exact), round: r2(Math.round(exact) - exact) };
  }, [lines, head.other_charges]);

  const valid = supplier && lines.some((l) => l.product && Number(l.quantity) > 0);

  const save = async () => {
    setSaving(true);
    try {
      const items = lines
        .filter((l) => l.product && Number(l.quantity) > 0)
        .map((l) => ({
          product_id: l.product.product_id,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost) || 0,
          gst_rate: Number(l.gst_rate) || 0,
          discount_amount: Number(l.discount_amount) || 0,
          batch_no: l.batch_no || undefined,
          expiry_date: l.expiry_date || undefined,
        }));
      const res = await PurchaseServices.create({
        ...head,
        store_id: storeId,
        supplier_id: supplier.supplier_id,
        due_date: head.due_date || undefined,
        other_charges: Number(head.other_charges) || 0,
        items,
        update_cost: updateCost,
        payment: Number(pay.amount) > 0 ? { ...pay, amount: Number(pay.amount) } : undefined,
      });
      notify(t(res.message));
      navigate("/purchases");
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <>
      <PageHeader title="New purchase bill" subtitle="Stock goes up, cost price updates and GST paid is kept as input credit" back="/purchases" actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Autocomplete
                fullWidth
                options={suppliers}
                value={supplier}
                onChange={(_, v) => setSupplier(v)}
                getOptionLabel={(s) => s.name}
                isOptionEqualToValue={(a, b) => a.supplier_id === b.supplier_id}
                renderInput={(p) => <TextField {...p} label={t("Supplier")} required />}
                renderOption={(props, s) => (
                  <li {...props} key={s.supplier_id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[s.phone, s.gstin, s.balance > 0 ? `${t("We owe")} ${formatCurrency(s.balance)}` : null].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
              <Tooltip title={t("New supplier")}>
                <IconButton onClick={() => setNewSupplier(true)} color="primary">
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <TextField fullWidth label={t("Supplier bill no.")} value={head.bill_no} onChange={(e) => setHead({ ...head, bill_no: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <TextField fullWidth type="date" label={t("Bill date")} value={head.purchase_date} onChange={(e) => setHead({ ...head, purchase_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField fullWidth type="date" label={t("Pay by")} value={head.due_date} onChange={(e) => setHead({ ...head, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
        {supplier && !supplier.gstin && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t("This supplier has no GSTIN. Add it to claim the GST you pay as input credit.")}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t("Items")}</Typography>
        {lines.map((l, i) => {
          const net = r2(Number(l.quantity) * Number(l.unit_cost)) - (Number(l.discount_amount) || 0);
          const amount = net > 0 ? r2(net * (1 + Number(l.gst_rate) / 100)) : 0;
          return (
            <Box key={l.key} sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <Grid container spacing={1} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <Autocomplete
                    options={catalog.products}
                    value={l.product}
                    loading={catalog.loading}
                    onChange={(_, v) => pickProduct(i, v)}
                    getOptionLabel={(p) => p.name}
                    isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
                    renderInput={(p) => <TextField {...p} size="small" label={`${t("Item")} ${i + 1}`} />}
                  />
                </Grid>
                <Grid size={{ xs: 4, md: 1.2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label={t("Qty")}
                    value={l.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                    slotProps={{ input: { endAdornment: l.product?.unit ? <InputAdornment position="end">{l.product.unit}</InputAdornment> : null }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                  />
                </Grid>
                <Grid size={{ xs: 4, md: 1.3 }}>
                  <TextField size="small" fullWidth type="number" label={t("Rate (before GST)")} value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }} />
                </Grid>
                <Grid size={{ xs: 4, md: 1 }}>
                  <TextField size="small" fullWidth select label={t("GST %")} value={l.gst_rate} onChange={(e) => setLine(i, { gst_rate: e.target.value })}>
                    {[...new Set([...GST_RATES, Number(l.gst_rate)])].map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}%
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 4, md: 1 }}>
                  <TextField size="small" fullWidth type="number" label={t("Discount ₹")} value={l.discount_amount} onChange={(e) => setLine(i, { discount_amount: e.target.value })} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
                </Grid>
                <Grid size={{ xs: 4, md: 1.2 }}>
                  <TextField size="small" fullWidth label={t("Batch no.")} value={l.batch_no} onChange={(e) => setLine(i, { batch_no: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 4, md: 1.6 }}>
                  <TextField size="small" fullWidth type="date" label={t("Expiry")} value={l.expiry_date} onChange={(e) => setLine(i, { expiry_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 1.7 }} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                    {formatCurrency(amount)}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, n) => n !== i) : [blankLine()]))} aria-label={t("Remove")}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          );
        })}
        <Button startIcon={<AddIcon />} onClick={() => setLines((ls) => [...ls, blankLine()])}>
          {t("Add item")}
        </Button>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t("Paid now (optional)")}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t("Amount paid")}
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: "any" } }}
                  helperText={
                    <Button size="small" sx={{ p: 0, minWidth: 0 }} onClick={() => setPay({ ...pay, amount: String(totals.total) })}>
                      {t("Full amount")}
                    </Button>
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField select fullWidth label={t("Mode")} value={pay.payment_method} onChange={(e) => setPay({ ...pay, payment_method: e.target.value })}>
                  {PAY_METHODS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {t(m)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField fullWidth label={t("Reference")} value={pay.reference_no} onChange={(e) => setPay({ ...pay, reference_no: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label={t("Notes")} value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel control={<Switch checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} />} label={t("Update product cost price from this bill")} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            {[
              ["Taxable value", totals.taxable],
              ["GST (input credit)", totals.tax],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography color="text.secondary">{t(k)}</Typography>
                <Typography>{formatCurrency(v)}</Typography>
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 2 }}>
              <Typography color="text.secondary">{t("Freight / other charges")}</Typography>
              <TextField size="small" type="number" value={head.other_charges} onChange={(e) => setHead({ ...head, other_charges: e.target.value })} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
            </Box>
            {totals.round !== 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography color="text.secondary">{t("Round off")}</Typography>
                <Typography>{formatCurrency(totals.round)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {t("Bill total")}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatCurrency(totals.total)}
              </Typography>
            </Box>
            {Number(pay.amount) > 0 && Number(pay.amount) < totals.total && (
              <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                {t("Balance to pay later")}: {formatCurrency(totals.total - Number(pay.amount))}
              </Typography>
            )}
            <Button fullWidth size="large" variant="contained" onClick={save} disabled={!valid || saving}>
              {t("Save purchase bill")}
            </Button>
          </Paper>
        </Grid>
      </Grid>
      {newSupplier && (
        <SupplierDialog
          supplier={null}
          storeId={storeId}
          onClose={() => setNewSupplier(false)}
          onSaved={(res) => {
            setNewSupplier(false);
            notify(t(res.message));
            loadSuppliers(res.supplier_id);
          }}
        />
      )}
    </>
  );
}
