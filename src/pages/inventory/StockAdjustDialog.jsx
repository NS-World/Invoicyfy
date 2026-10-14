import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { InventoryServices } from "../../services/InventoryServices";
import useMeta from "../../hooks/useMeta";
import { apiError, formatCurrency, formatNumber, today } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

const TYPES = [
  { value: "purchase", label: "Purchase / Stock in (+)" },
  { value: "return", label: "Customer return (+)" },
  { value: "adjustment-in", label: "Correction: add (+)" },
  { value: "adjustment-out", label: "Correction: reduce (−)" },
  { value: "damage", label: "Damage / Wastage / Expiry (−)" },
];

export default function StockAdjustDialog({ product, open, onClose, onSaved }) {
  const t = useT();
  const meta = useMeta();
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && product) {
      setForm({ type: "purchase", quantity: "", unit_cost: product.cost_price || "", notes: "", record_expense: true, vendor: "", payment_method: "Cash", date: today(), batch_no: "", expiry_date: "" });
      setError("");
    }
  }, [open, product]);

  if (!product) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isPurchase = form.type === "purchase";

  const save = async () => {
    setSaving(true);
    setError("");
    const [type, dir] = form.type.split("-");
    try {
      const res = await InventoryServices.adjustStock({
        product_id: product.product_id,
        type,
        direction: dir,
        quantity: form.quantity,
        unit_cost: isPurchase && form.unit_cost !== "" ? form.unit_cost : undefined,
        notes: form.notes,
        record_expense: isPurchase && form.record_expense,
        vendor: form.vendor,
        payment_method: form.payment_method,
        date: form.date,
        batch_no: isPurchase && form.batch_no ? form.batch_no : undefined,
        expiry_date: isPurchase && form.expiry_date ? form.expiry_date : undefined,
      });
      onSaved(res);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update stock</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <b>{product.name}</b> · Current stock {formatNumber(product.stock_qty, 3)} {product.unit}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField select fullWidth label={t("Type")} value={form.type || "purchase"} onChange={set("type")}>
              {TYPES.map((ty) => (
                <MenuItem key={ty.value} value={ty.value}>
                  {t(ty.label)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth autoFocus type="number" label={`${t("Quantity")} (${product.unit || "pcs"})`} value={form.quantity ?? ""} onChange={set("quantity")} slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }} />
          </Grid>
          {isPurchase && (
            <Grid size={6}>
              <TextField fullWidth type="number" label={t("Cost per unit ₹")} value={form.unit_cost ?? ""} onChange={set("unit_cost")} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
            </Grid>
          )}
          {isPurchase && (
            <>
              <Grid size={6}>
                <TextField fullWidth label={t("Batch no.")} value={form.batch_no || ""} onChange={set("batch_no")} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth type="date" label={t("Expiry date")} value={form.expiry_date || ""} onChange={set("expiry_date")} slotProps={{ inputLabel: { shrink: true } }} helperText={t("Optional")} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={Boolean(form.record_expense)} onChange={(e) => setForm((f) => ({ ...f, record_expense: e.target.checked }))} />}
                  label={`Also add to expenses${form.quantity && form.unit_cost ? ` (${formatCurrency(form.quantity * form.unit_cost)})` : ""}`}
                />
              </Grid>
              {form.record_expense && (
                <>
                  <Grid size={6}>
                    <TextField fullWidth label={t("Supplier")} value={form.vendor || ""} onChange={set("vendor")} />
                  </Grid>
                  <Grid size={6}>
                    <TextField select fullWidth label={t("Paid by")} value={form.payment_method || "Cash"} onChange={set("payment_method")}>
                      {meta.payment_methods.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}
            </>
          )}
          <Grid size={12}>
            <TextField fullWidth label={t("Notes")} value={form.notes || ""} onChange={set("notes")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !(Number(form.quantity) > 0)}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
