import { useState } from "react";
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
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { CategoryServices } from "../../services/CategoryServices";
import { useT } from "../../context/PrefsContext";
import useMeta from "../../hooks/useMeta";
import { apiError } from "../../utils/format";
import { DEFAULT_WEIGHT_PRESETS, gramsLabel, isWeightUnit, parsePresets } from "../../utils/weight";

const blank = { name: "", default_unit: "pcs", gst_rate: "", hsn_code: "", weight_presets: "", description: "", sort_order: 0, is_active: true };

/** Add / edit a category. onSaved(category) gets the saved row (used by the product form's "+ New category"). */
export default function CategoryDialog({ category, onClose, onSaved }) {
  const t = useT();
  const meta = useMeta();
  const [form, setForm] = useState(() => (category ? { ...blank, ...category, gst_rate: category.gst_rate ?? "", is_active: Boolean(category.is_active) } : blank));
  const [applyUnit, setApplyUnit] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const loose = isWeightUnit(form.default_unit);
  const presets = parsePresets(form.weight_presets);
  const unitChanged = category && category.default_unit !== form.default_unit && category.product_count > 0;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, gst_rate: form.gst_rate === "" ? null : form.gst_rate, weight_presets: loose ? form.weight_presets : "" };
      if (category) {
        await CategoryServices.update({ ...payload, category_id: category.category_id, apply_unit_to_products: applyUnit });
        onSaved({ ...category, ...payload });
      } else {
        const res = await CategoryServices.add(payload);
        onSaved(res.data);
      }
    } catch (e) {
      setError(apiError(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{category ? t("Edit Category") : t("Add Category")}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField fullWidth autoFocus required label={t("Category name")} placeholder={t("e.g. Loose Ice Cream")} value={form.name} onChange={set("name")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField select fullWidth label={t("Default unit")} value={form.default_unit} onChange={set("default_unit")} helperText={t("New products get this unit")}>
              {[...new Set([...meta.units, form.default_unit])].filter(Boolean).map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select fullWidth label={t("GST %")} value={form.gst_rate} onChange={set("gst_rate")}>
              <MenuItem value="">{t("Not set")}</MenuItem>
              {meta.gst_rates.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}%
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth label={t("HSN / SAC code")} value={form.hsn_code || ""} onChange={set("hsn_code")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth type="number" label={t("Sort order")} value={form.sort_order} onChange={set("sort_order")} />
          </Grid>
          {loose && (
            <Grid size={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("Quick sizes for loose items")}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                {presets.map((g) => (
                  <Chip key={g} label={gramsLabel(g, form.default_unit)} onDelete={presets.length > 1 ? () => setForm((f) => ({ ...f, weight_presets: presets.filter((x) => x !== g).join(",") })) : undefined} />
                ))}
                <TextField
                  size="small"
                  type="number"
                  placeholder="g / ml"
                  sx={{ width: 100 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && Number(e.target.value) > 0) {
                      e.preventDefault();
                      setForm((f) => ({ ...f, weight_presets: [...new Set([...presets, Math.round(Number(e.target.value))])].sort((a, b) => a - b).join(",") }));
                      e.target.value = "";
                    }
                  }}
                />
                <Button size="small" onClick={() => setForm((f) => ({ ...f, weight_presets: DEFAULT_WEIGHT_PRESETS.join(",") }))}>
                  {t("Reset")}
                </Button>
              </Box>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label={t("Description")} value={form.description || ""} onChange={set("description")} />
          </Grid>
          <Grid size={12}>
            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />} label={t("Active (shown in product form)")} />
          </Grid>
          {unitChanged && (
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={applyUnit} onChange={(e) => setApplyUnit(e.target.checked)} />}
                label={t("Also change the unit of its {n} product(s) to {unit}", { n: category.product_count, unit: form.default_unit })}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? t("Saving...") : t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
