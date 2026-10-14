import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, TextField } from "@mui/material";
import { SupplierServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, today } from "../../utils/format";

import { PAY_METHODS } from "../../utils/v4";

/** Pay a supplier: against one purchase bill, or the oldest unpaid bills first. */
export default function SupplierPayDialog({ supplier, purchase, onClose, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const due = purchase ? purchase.balance_due : Math.max(0, supplier.balance || 0);
  const [f, setF] = useState({ amount: due > 0 ? String(due) : "", payment_method: "Cash", payment_date: today(), reference_no: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await SupplierServices.pay({ ...f, supplier_id: supplier.supplier_id, purchase_id: purchase?.purchase_id });
      onSaved(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {t("Pay")} {supplier.name}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {purchase
            ? t("Bill {bill}: balance {amount}", { bill: purchase.bill_no || `#${purchase.purchase_id}`, amount: formatCurrency(purchase.balance_due) })
            : t("We owe {amount}. The payment clears the oldest bills first.", { amount: formatCurrency(supplier.balance || 0) })}
        </Alert>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              fullWidth
              autoFocus
              type="number"
              label={t("Amount paid")}
              value={f.amount}
              onChange={set("amount")}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField select fullWidth label={t("Mode")} value={f.payment_method} onChange={set("payment_method")}>
              {PAY_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {t(m)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth type="date" label={t("Date")} value={f.payment_date} onChange={set("payment_date")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label={t("Reference / UTR / Cheque no.")} value={f.reference_no} onChange={set("reference_no")} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label={t("Notes")} value={f.notes} onChange={set("notes")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !(Number(f.amount) > 0)}>
          {t("Save payment")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
