import { useEffect, useState } from "react";
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField } from "@mui/material";
import { ExpenseServices } from "../../services/ExpenseServices";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { useAuth } from "../../context/useAuth";
import { apiError, today } from "../../utils/format";

const blank = () => ({ expense_date: today(), category: "", description: "", vendor: "", amount: "", tax_amount: "", payment_method: "Cash", reference_no: "", store_id: "" });

export default function ExpenseDialog({ open, expense, categories, onClose, onSaved }) {
  const meta = useMeta();
  const { isAdmin } = useAuth();
  const { stores, defaultStoreId } = useStores();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(expense ? { ...blank(), ...expense, tax_amount: expense.tax_amount || "" } : { ...blank(), store_id: defaultStoreId });
  }, [open, expense, defaultStoreId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (expense) await ExpenseServices.updateExpense(form);
      else await ExpenseServices.addExpense(form);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" label="Date" value={form.expense_date} onChange={set("expense_date")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth autoFocus type="number" label="Amount ₹ (incl. GST)" value={form.amount} onChange={set("amount")} slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }} />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              freeSolo
              options={categories}
              value={form.category}
              onInputChange={(_, v) => setForm((f) => ({ ...f, category: v }))}
              renderInput={(params) => <TextField {...params} label="Category" required />}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Description" value={form.description || ""} onChange={set("description")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Paid to (vendor)" value={form.vendor || ""} onChange={set("vendor")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Paid by" value={form.payment_method} onChange={set("payment_method")}>
              {meta.payment_methods.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="GST paid ₹ (ITC)" helperText="Optional, for input tax credit" value={form.tax_amount} onChange={set("tax_amount")} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="Bill / Ref no." value={form.reference_no || ""} onChange={set("reference_no")} />
          </Grid>
          {isAdmin && stores.length > 1 && (
            <Grid size={12}>
              <TextField select fullWidth label="Store" value={form.store_id} onChange={set("store_id")}>
                {stores.map((s) => (
                  <MenuItem key={s.store_id} value={s.store_id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.category || !(Number(form.amount) > 0)}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
