import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, InputAdornment, Switch, TextField } from "@mui/material";
import { SupplierServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError } from "../../utils/format";

const EMPTY = { name: "", contact_person: "", phone: "", email: "", gstin: "", address: "", opening_balance: "", notes: "", is_active: true };

/** Add / edit a supplier. */
export default function SupplierDialog({ supplier, storeId, onClose, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const [f, setF] = useState(() => (supplier ? { ...EMPTY, ...supplier, is_active: Boolean(supplier.is_active) } : EMPTY));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...f, store_id: storeId, gstin: f.gstin?.toUpperCase() };
      const res = supplier ? await SupplierServices.update({ ...body, supplier_id: supplier.supplier_id }) : await SupplierServices.add(body);
      onSaved(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{supplier ? t("Edit supplier") : t("New supplier")}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField fullWidth required autoFocus label={t("Supplier name")} value={f.name} onChange={set("name")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth label={t("Contact person")} value={f.contact_person || ""} onChange={set("contact_person")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Mobile")} value={f.phone || ""} onChange={set("phone")} slotProps={{ htmlInput: { inputMode: "tel" } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Email")} value={f.email || ""} onChange={set("email")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("GSTIN")} value={f.gstin || ""} onChange={set("gstin")} helperText={t("Needed to claim GST input credit")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label={t("Opening balance (we owe)")}
              value={f.opening_balance ?? ""}
              onChange={set("opening_balance")}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { step: "any" } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline minRows={2} label={t("Address")} value={f.address || ""} onChange={set("address")} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label={t("Notes")} value={f.notes || ""} onChange={set("notes")} />
          </Grid>
          {supplier && (
            <Grid size={12}>
              <FormControlLabel control={<Switch checked={f.is_active} onChange={(e) => setF((x) => ({ ...x, is_active: e.target.checked }))} />} label={t("Active")} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !f.name.trim()}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
