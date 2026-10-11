import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { PaymentServices } from "../../services/PaymentServices";
import useMeta from "../../hooks/useMeta";
import { apiError, formatCurrency, today } from "../../utils/format";

export default function PaymentDialog({ invoice, open, onClose, onSaved }) {
  const meta = useMeta();
  const [form, setForm] = useState({ amount: "", payment_method: "Cash", payment_date: today(), reference_no: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && invoice) {
      setForm({ amount: invoice.balance_due, payment_method: "Cash", payment_date: today(), reference_no: "", notes: "" });
      setError("");
    }
  }, [open, invoice]);

  if (!invoice) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await PaymentServices.createPayment({ ...form, invoice_id: invoice.invoice_id });
      onSaved?.(res);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ mb: 2 }}>
          {invoice.invoice_number} · {invoice.customer_name || "Walk-in"}
          <br />
          Balance due: <b>{formatCurrency(invoice.balance_due)}</b>
        </Typography>
        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField fullWidth autoFocus type="number" label="Amount ₹" value={form.amount} onChange={set("amount")} slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth type="date" label="Date" value={form.payment_date} onChange={set("payment_date")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={12}>
            <TextField select fullWidth label="Payment mode" value={form.payment_method} onChange={set("payment_method")}>
              {meta.payment_methods.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Reference / UTR / Cheque no." value={form.reference_no} onChange={set("reference_no")} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Notes" value={form.notes} onChange={set("notes")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !(Number(form.amount) > 0)}>
          {saving ? "Saving..." : "Save Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
