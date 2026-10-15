import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchField from "../../components/common/SearchField";
import { InventoryServices } from "../../services/InventoryServices";
import useDebounce from "../../hooks/useDebounce";
import { apiError, formatNumber } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

const statusOf = (p) => {
  if (!p.track_inventory) return { label: "Not tracked", color: "default" };
  if (p.stock_qty <= 0) return { label: "Out of stock", color: "error" };
  if (p.stock_qty <= p.low_stock_threshold) return { label: "Low stock", color: "warning" };
  return { label: "In stock", color: "success" };
};

/**
 * "Add inventory": the product list with a quantity box per product. Enter what arrived for any number of
 * products (search keeps what was typed), add a note, save once. Then shows each product's new stock and status.
 */
export default function AddInventoryDialog({ open, onClose, onSaved }) {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [products, setProducts] = useState([]);
  const [more, setMore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState({}); // product_id -> { product, qty, cost }
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setEntries({});
    setNotes("");
    setResult(null);
    setError("");
    setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    InventoryServices.getStock(0, 100, q, {})
      .then((r) => {
        if (!alive) return;
        setProducts(r.data || []);
        setMore(Math.max(0, (r.total || 0) - (r.data || []).length));
      })
      .catch((e) => alive && setError(apiError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, q]);

  const chosen = useMemo(() => Object.values(entries).filter((e) => Number(e.qty) > 0), [entries]);
  const set = (p, field, value) =>
    setEntries((prev) => ({ ...prev, [p.product_id]: { product: p, qty: "", cost: "", ...prev[p.product_id], [field]: value } }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await InventoryServices.addStock({
        notes: notes.trim() || undefined,
        items: chosen.map((e) => ({ product_id: e.product.product_id, quantity: Number(e.qty), unit_cost: e.cost === "" ? undefined : Number(e.cost) })),
      });
      setResult(res);
      onSaved?.(res);
    } catch (e) {
      setError(apiError(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md" fullScreen={phone}>
      <DialogTitle>{result ? t("Stock added") : t("Add inventory")}</DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {result ? (
          <>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              {t(result.message)}
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("Product")}</TableCell>
                    <TableCell align="right">{t("Added")}</TableCell>
                    <TableCell align="right">{t("Stock now")}</TableCell>
                    <TableCell>{t("Status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.data.map((r) => (
                    <TableRow key={r.product_id}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>
                        +{formatNumber(r.added, 3)} {r.unit}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatNumber(r.stock_qty, 3)} {r.unit}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={t(r.status)} color={r.status === "In stock" ? "success" : r.status === "Low stock" ? "warning" : "error"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
              <SearchField value={search} onChange={setSearch} placeholder={t("Search product, SKU, category")} />
              {chosen.length > 0 && <Chip color="primary" label={`${chosen.length} ${t("product(s) selected")}`} onDelete={() => setEntries({})} />}
            </Box>
            <TableContainer sx={{ maxHeight: { xs: "calc(100vh - 290px)", sm: 420 } }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("Product")}</TableCell>
                    <TableCell align="right">{t("Current stock")}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{t("Status")}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>{t("Add qty")}</TableCell>
                    <TableCell sx={{ minWidth: 100, display: { xs: "none", sm: "table-cell" } }}>{t("Cost / unit")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress size={22} />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        {t("No products found")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    products.map((p) => {
                      const st = statusOf(p);
                      const e = entries[p.product_id] || {};
                      return (
                        <TableRow key={p.product_id} selected={Number(e.qty) > 0}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {p.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.category}
                            </Typography>
                            <Box sx={{ display: { xs: "block", sm: "none" } }}>
                              <Chip size="small" variant="outlined" label={t(st.label)} color={st.color} />
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            {p.track_inventory ? `${formatNumber(p.stock_qty, 3)} ${p.unit || ""}` : "—"}
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip size="small" variant="outlined" label={t(st.label)} color={st.color} />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={e.qty ?? ""}
                              onChange={(ev) => set(p, "qty", ev.target.value)}
                              placeholder="0"
                              slotProps={{
                                input: { endAdornment: p.unit ? <InputAdornment position="end">{p.unit}</InputAdornment> : null },
                                htmlInput: { min: 0, step: "any", inputMode: "decimal", "aria-label": `${t("Add qty")} ${p.name}` },
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <TextField
                              size="small"
                              type="number"
                              value={e.cost ?? ""}
                              onChange={(ev) => set(p, "cost", ev.target.value)}
                              placeholder={p.cost_price ? String(p.cost_price) : "₹"}
                              slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            {more > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {t("{n} more product(s) — search to find them.", { n: more })}
              </Typography>
            )}
            <TextField
              fullWidth
              size="small"
              sx={{ mt: 1.5 }}
              label={t("Note (supplier, bill no, reason)")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <Typography variant="caption" color="text.secondary">
              {t("Products with stock tracking off start being tracked. Every entry is saved in the stock history.")}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button variant="contained" onClick={onClose}>
            {t("Done")}
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>
              {t("Cancel")}
            </Button>
            <Button variant="contained" onClick={save} disabled={saving || chosen.length === 0}>
              {saving ? t("Saving...") : `${t("Save stock")}${chosen.length ? ` (${chosen.length})` : ""}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
