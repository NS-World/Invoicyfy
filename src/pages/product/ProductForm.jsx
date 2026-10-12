import { useEffect, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, Divider, FormControlLabel, Grid, InputAdornment, MenuItem, Paper, Switch, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ProductServices } from "../../services/ProductServices";
import { CategoryServices } from "../../services/CategoryServices";
import { useT } from "../../context/PrefsContext";
import CategoryDialog from "../category/CategoryDialog";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { apiError, formatCurrency } from "../../utils/format";
import { calcLine } from "../../utils/gst";
import { DEFAULT_WEIGHT_PRESETS, gramsLabel, gramsPerUnit, isWeightUnit, measureUnits, parsePresets } from "../../utils/weight";

const blank = {
  name: "",
  sku: "",
  category: "",
  description: "",
  hsn_code: "",
  unit: "pcs",
  price: "",
  cost_price: "",
  gst_rate: 0,
  price_includes_tax: true,
  track_inventory: true,
  stock_qty: "",
  low_stock_threshold: "",
  status: "Active",
  store_id: "",
  weight_presets: "",
};

export default function ProductForm() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const meta = useMeta();
  const { isAdmin, can } = useAuth();
  const { stores, defaultStoreId } = useStores();
  const productId = params.get("id") || location.state?.productData?.product_id || location.state?.productData?.id || null;

  const [form, setForm] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState(false);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    CategoryServices.list(0, 500, "", { active: 1 }).then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    ProductServices.getProductDataFromId(productId)
      .then((res) => {
        const d = res.data;
        setForm({
          ...Object.fromEntries(Object.keys(blank).map((k) => [k, d[k] ?? blank[k]])),
          price_includes_tax: Boolean(d.price_includes_tax),
          track_inventory: Boolean(d.track_inventory),
        });
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!form.store_id && defaultStoreId) setForm((f) => ({ ...f, store_id: defaultStoreId }));
  }, [defaultStoreId, form.store_id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Choosing a category fills its unit, and GST / HSN / sizes when the category has them.
  const chooseCategory = (c) => {
    if (!c) return setForm((f) => ({ ...f, category: "" }));
    setForm((f) => ({
      ...f,
      category: c.name,
      unit: c.default_unit || f.unit,
      gst_rate: c.gst_rate !== null && c.gst_rate !== undefined ? Number(c.gst_rate) : f.gst_rate,
      hsn_code: f.hsn_code || c.hsn_code || "",
      weight_presets: c.weight_presets || f.weight_presets,
    }));
  };
  const categoryOptions = [...categories, ...(form.category && !categories.some((c) => c.name === form.category) ? [{ name: form.category, default_unit: form.unit }] : [])];
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));
  const preview = calcLine({ quantity: 1, unit_price: form.price, gst_rate: form.gst_rate, price_includes_tax: form.price_includes_tax }, false);
  const byWeight = isWeightUnit(form.unit);
  const presets = parsePresets(form.weight_presets);
  const [newPreset, setNewPreset] = useState("");
  const setPresets = (list) => setForm((f) => ({ ...f, weight_presets: list.join(",") }));
  const margin = Number(form.cost_price) > 0 ? preview.taxable - Number(form.cost_price) : null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, product_id: productId || undefined };
      if (productId) await ProductServices.updateProductData(payload);
      else await ProductServices.postProductData(payload);
      notify(productId ? "Product updated" : "Product added");
      navigate("/products");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  const rupee = { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader title={productId ? "Edit Product" : "Add Product"} back="/products" />
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth required label={t("Product / service name")} placeholder={t("Example: Kesar Pista Ice Cream")} value={form.name} onChange={set("name")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label={t("SKU / Code")} value={form.sku || ""} onChange={set("sku")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Autocomplete
                fullWidth
                options={categoryOptions}
                value={categoryOptions.find((c) => c.name === form.category) || null}
                getOptionLabel={(c) => c.name || ""}
                isOptionEqualToValue={(a, b) => a.name === b.name}
                onChange={(_, c) => chooseCategory(c)}
                renderOption={(props, c) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 1 }}>
                        <span>{c.name}</span>
                        <Typography variant="caption" color="text.secondary">
                          {c.default_unit}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(p) => <TextField {...p} label={t("Category")} />}
              />
              {can("products", "add") && (
                <Button variant="outlined" onClick={() => setNewCategory(true)} sx={{ minWidth: 0, px: 1.25 }} aria-label={t("Add Category")} title={t("Add Category")}>
                  +
                </Button>
              )}
            </Box>
            {newCategory && (
              <CategoryDialog
                onClose={() => setNewCategory(false)}
                onSaved={(c) => {
                  setNewCategory(false);
                  setCategories((list) => [...list, c]);
                  chooseCategory(c);
                }}
              />
            )}
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select fullWidth label={t("Unit")} value={form.unit} onChange={set("unit")}>
              {[...new Set([...meta.units, form.unit])].filter(Boolean).map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select fullWidth label={t("Status")} value={form.status} onChange={set("status")}>
              <MenuItem value="Active">{t("Active")}</MenuItem>
              <MenuItem value="Inactive">{t("Inactive")}</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label={t("Description")} value={form.description || ""} onChange={set("description")} />
          </Grid>

          <Grid size={12}>
            <Divider textAlign="left">
              <Typography variant="overline">{t("Price & GST")}</Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth required type="number" label={byWeight ? `${t("Selling price")} / ${form.unit}` : t("Selling price")} value={form.price} onChange={set("price")} slotProps={rupee} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select fullWidth label={t("GST rate")} value={Number(form.gst_rate)} onChange={set("gst_rate")}>
              {[...new Set([...meta.gst_rates, Number(form.gst_rate)])].sort((a, b) => a - b).map((r) => (
                <MenuItem key={r} value={r}>
                  {r}%
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label={t("HSN / SAC code")} value={form.hsn_code || ""} onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value.replace(/\D/g, "") }))} slotProps={{ htmlInput: { maxLength: 8, inputMode: "numeric" } }} helperText={t("Required on B2B tax invoices")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <FormControlLabel control={<Switch checked={form.price_includes_tax} onChange={setBool("price_includes_tax")} />} label={t("Selling price includes GST (MRP style)")} />
            {Number(form.price) > 0 && (
              <Typography variant="caption" color="text.secondary" display="block">
                {t("Customer pays")} {formatCurrency(preview.total)} · {t("taxable")} {formatCurrency(preview.taxable)} + GST {formatCurrency(preview.tax)}
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth type="number" label={t("Purchase / cost price")} value={form.cost_price} onChange={set("cost_price")} slotProps={rupee} helperText={margin !== null ? `${t("Margin")} ${formatCurrency(margin)} / ${form.unit}` : t("Used for profit reports")} />
          </Grid>

          {byWeight && (
            <Grid size={12}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t("Loose / by weight")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t("While billing, tap a size or type weight, amount or quantity — the rest is calculated.")}
                  {Number(form.price) > 0 && ` ${t("e.g.")} ${gramsLabel(250, form.unit)} = ${formatCurrency((Number(form.price) * 250) / gramsPerUnit(form.unit))}`}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {presets.map((g) => (
                    <Chip key={g} label={gramsLabel(g, form.unit)} onDelete={presets.length > 1 ? () => setPresets(presets.filter((x) => x !== g)) : undefined} color="primary" variant="outlined" />
                  ))}
                  <TextField
                    size="small"
                    type="number"
                    placeholder={t("Add size")}
                    value={newPreset}
                    onChange={(e) => setNewPreset(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (Number(newPreset) > 0) setPresets([...presets, Number(newPreset)].sort((a, b) => a - b));
                        setNewPreset("");
                      }
                    }}
                    sx={{ width: 130 }}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">{measureUnits(form.unit)[0]}</InputAdornment> } }}
                  />
                  <Button size="small" onClick={() => setPresets(DEFAULT_WEIGHT_PRESETS)}>
                    {t("Reset")}
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}

          <Grid size={12}>
            <Divider textAlign="left">
              <Typography variant="overline">{t("Inventory")}</Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Switch checked={form.track_inventory} onChange={setBool("track_inventory")} />} label={t("Track stock")} />
          </Grid>
          {form.track_inventory && (
            <>
              {!productId && (
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth type="number" label={t("Opening stock")} value={form.stock_qty} onChange={set("stock_qty")} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
                </Grid>
              )}
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField fullWidth type="number" label={t("Low stock alert at")} value={form.low_stock_threshold} onChange={set("low_stock_threshold")} slotProps={{ htmlInput: { min: 0, step: "any" } }} />
              </Grid>
              {productId && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                    {t("Current stock")}: <b>{form.stock_qty}</b> — {t("use Inventory to add or reduce stock.")}
                  </Typography>
                </Grid>
              )}
            </>
          )}
          {isAdmin && stores.length > 1 && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label={t("Store")} value={form.store_id} onChange={set("store_id")}>
                {stores.map((s) => (
                  <MenuItem key={s.store_id} value={s.store_id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
        <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => navigate("/products")}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? t("Saving...") : productId ? t("Update Product") : t("Add Product")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
