import { useEffect, useState } from "react";
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, TextField } from "@mui/material";
import { BatchServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatDate } from "../../utils/format";

import { WASTAGE_REASONS } from "../../utils/v4";

/** Wastage entry: melted / expired / damaged stock goes out and its cost is counted as loss. */
export default function WastageDialog({ products, preset, onClose, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const [product, setProduct] = useState(preset?.product || null);
  const [batches, setBatches] = useState([]);
  const [f, setF] = useState({ quantity: preset?.quantity ? String(preset.quantity) : "", reason: preset?.reason || "Melted", batch_id: preset?.batch_id || "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return setBatches([]);
    BatchServices.list(0, 50, "", { product_id: product.product_id })
      .then((r) => setBatches(r.data || []))
      .catch(() => setBatches([]));
  }, [product]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await BatchServices.addWastage({ ...f, product_id: product.product_id, quantity: Number(f.quantity), batch_id: f.batch_id || undefined });
      onSaved(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("Wastage entry")}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Autocomplete
              options={products}
              value={product}
              onChange={(_, v) => {
                setProduct(v);
                setF((x) => ({ ...x, batch_id: "" }));
              }}
              getOptionLabel={(p) => p.name}
              isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
              renderInput={(p) => <TextField {...p} label={t("Item")} autoFocus={!preset} />}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              type="number"
              label={t("Quantity wasted")}
              value={f.quantity}
              onChange={(e) => setF({ ...f, quantity: e.target.value })}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">{product?.unit || ""}</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField select fullWidth label={t("Reason")} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
              {WASTAGE_REASONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(r)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {batches.length > 0 && (
            <Grid size={12}>
              <TextField select fullWidth label={t("From batch (optional)")} value={f.batch_id} onChange={(e) => setF({ ...f, batch_id: e.target.value })}>
                <MenuItem value="">{t("Oldest first (automatic)")}</MenuItem>
                {batches.map((b) => (
                  <MenuItem key={b.batch_id} value={b.batch_id}>
                    {b.batch_no || `#${b.batch_id}`} · {b.expiry_date ? `${t("exp")} ${formatDate(b.expiry_date)}` : t("no expiry")} · {b.qty_left} {b.unit}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label={t("Notes")} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" color="error" onClick={save} disabled={saving || !product || !(Number(f.quantity) > 0)}>
          {t("Save wastage")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
