import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import NotesIcon from "@mui/icons-material/StickyNote2Outlined";
import ScaleIcon from "@mui/icons-material/Scale";
import { ProductServices } from "../../services/ProductServices";
import useDebounce from "../../hooks/useDebounce";
import useMeta from "../../hooks/useMeta";
import useElementWidth from "../../hooks/useElementWidth";
import { calcLine, emptyItem } from "../../utils/gst";
import { formatCurrency, formatNumber } from "../../utils/format";
import { gramsLabel, gramsPerUnit, isWeightUnit, rateSuffix } from "../../utils/weight";
import { useT } from "../../context/PrefsContext";
import MeasurePicker from "./MeasurePicker";
import QuickItems from "./QuickItems";

function ProductSelect({ item, onPick, onText, storeId, autoFocus }) {
  const t = useT();
  const [input, setInput] = useState(item.product_name || "");
  const [options, setOptions] = useState([]);
  const term = useDebounce(input, 250);
  // Keep the box in sync when the item is filled from elsewhere (quick-pick buttons).
  const [shownName, setShownName] = useState(item.product_name);
  if (shownName !== item.product_name) {
    setShownName(item.product_name);
    setInput(item.product_name || "");
  }

  useEffect(() => {
    let active = true;
    ProductServices.getProductsData(0, 20, term, { status: "Active", store_id: storeId })
      .then((res) => active && setOptions(res.data || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [term, storeId]);

  return (
    <Autocomplete
      freeSolo
      fullWidth
      options={options}
      filterOptions={(x) => x}
      inputValue={input}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
      onInputChange={(_, v, reason) => {
        setInput(v);
        if (reason === "input") onText(v);
      }}
      onChange={(_, v) => {
        if (v && typeof v === "object") onPick(v);
      }}
      // The list is wider than the item column so names, price and stock stay readable.
      slotProps={{
        popper: { placement: "bottom-start", sx: { minWidth: { xs: "min(340px, calc(100vw - 32px))", sm: 380 } } },
        listbox: { sx: { maxHeight: 320 } },
      }}
      renderOption={(props, o) => {
        const { key, ...rest } = props;
        const low = o.track_inventory && Number(o.stock_qty) <= Number(o.low_stock_threshold);
        const weight = isWeightUnit(o.unit);
        return (
          <li key={key} {...rest}>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 2 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "normal", lineHeight: 1.3 }}>
                  {o.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[o.category, o.sku, o.hsn_code && `HSN ${o.hsn_code}`, `GST ${formatNumber(o.gst_rate)}%`, weight && t("loose")].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {formatCurrency(o.price)}
                  {rateSuffix(o.unit)}
                </Typography>
                {Boolean(o.track_inventory) && (
                  <Typography variant="caption" color={low ? "error" : "text.secondary"} sx={{ whiteSpace: "nowrap" }}>
                    {t("Stock")} {formatNumber(o.stock_qty, 3)} {o.unit}
                  </Typography>
                )}
              </Box>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} placeholder={t("Search product or type item name")} autoFocus={autoFocus} />}
    />
  );
}

/**
 * Line items editor. Lays itself out by the width it actually gets (sidebar open or collapsed, tablet, phone):
 * a table when there is room, otherwise one card per item.
 */
export default function ItemsEditor({ items, onChange, interstate, storeId, showDiscount = true, quickPick = true }) {
  const t = useT();
  const meta = useMeta();
  const [focusKey, setFocusKey] = useState(null);
  const [boxRef, width] = useElementWidth();
  const [notesOpen, setNotesOpen] = useState({});
  const anyWeight = items.some((it) => isWeightUnit(it.unit));
  // Table needs ~860px; below that each item becomes a card. Loose items get a full-width weight bar under their row.
  const wide = width >= 860;
  const columns = `28px minmax(220px, 1fr) 100px 110px ${showDiscount ? "90px " : ""}90px 44px 110px 72px`;

  const update = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx) => onChange(items.length === 1 ? [emptyItem()] : items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, emptyItem()]);

  const fromProduct = (p, current = {}) => {
    const weight = isWeightUnit(p.unit);
    return {
      product_id: p.product_id,
      product_name: p.name,
      hsn_code: p.hsn_code || "",
      unit: p.unit || "pcs",
      unit_price: Number(p.price) || 0,
      gst_rate: Number(p.gst_rate) || 0,
      price_includes_tax: Boolean(Number(p.price_includes_tax)),
      weight_presets: p.weight_presets || null,
      // Loose items start empty so the cashier taps a size or types weight / amount.
      quantity: weight ? "" : current.quantity || 1,
      qty_entry: "g",
    };
  };
  const pick = (idx, p) => {
    update(idx, fromProduct(p, items[idx]));
    if (isWeightUnit(p.unit)) setFocusKey(items[idx].key);
  };
  // Quick-pick: same product already billed (not loose) -> +1, else fill the empty row or add a new one.
  const quickAdd = (p) => {
    const weight = isWeightUnit(p.unit);
    const same = !weight && items.findIndex((it) => it.product_id === p.product_id && !isWeightUnit(it.unit));
    if (same !== false && same >= 0) {
      update(same, { quantity: (Number(items[same].quantity) || 0) + 1 });
      return;
    }
    const empty = items.findIndex((it) => !it.product_id && !String(it.product_name || "").trim());
    const row = { ...(empty >= 0 ? items[empty] : emptyItem()), ...fromProduct(p) };
    onChange(empty >= 0 ? items.map((it, i) => (i === empty ? row : it)) : [...items, row]);
    if (weight) setFocusKey(row.key);
  };

  const rateSelect = (it, idx, label) => (
    <TextField select value={Number(it.gst_rate)} onChange={(e) => update(idx, { gst_rate: Number(e.target.value) })} fullWidth label={label}>
      {[...new Set([...meta.gst_rates, Number(it.gst_rate)])].sort((a, b) => a - b).map((r) => (
        <MenuItem key={r} value={r}>
          {r}%
        </MenuItem>
      ))}
    </TextField>
  );

  const num = (value, onValue, props = {}) => (
    <TextField
      type="number"
      value={value}
      onChange={(e) => onValue(e.target.value === "" ? "" : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal", style: { textAlign: "right" } } }}
      fullWidth
      {...props}
    />
  );

  const noteField = (it, idx) => (
    <TextField fullWidth placeholder={t("Item note (e.g. Dry Fruits: Pista - 1x50 = 50)")} value={it.item_note} onChange={(e) => update(idx, { item_note: e.target.value })} />
  );

  const measure = (it, idx) => (
    <MeasurePicker item={it} onChange={(patch) => update(idx, patch)} autoFocus={focusKey === it.key} />
  );

  const card = (it, idx) => {
    const l = calcLine(it, interstate);
    const weight = isWeightUnit(it.unit);
    const cols = width >= 560 ? 4 : 2;
    return (
      <Paper key={it.key} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            #{idx + 1}
          </Typography>
          {weight && <Chip size="small" icon={<ScaleIcon />} label={t("Loose / by weight")} variant="outlined" />}
          <Box sx={{ flex: 1 }} />
          <Typography variant="subtitle2">{formatCurrency(l.total)}</Typography>
          <IconButton size="small" color="error" onClick={() => remove(idx)} aria-label={t("Remove")}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
        <ProductSelect item={it} storeId={storeId} onPick={(p) => pick(idx, p)} onText={(v) => update(idx, { product_name: v, product_id: null })} />
        {weight && <Box sx={{ mt: 1.5 }}>{measure(it, idx)}</Box>}
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1, mt: 1.5 }}>
          {!weight && num(it.quantity, (v) => update(idx, { quantity: v }), { label: `${t("Qty")} (${it.unit || "pcs"})` })}
          {num(it.unit_price, (v) => update(idx, { unit_price: v }), { label: weight ? `${t("Price")} ${rateSuffix(it.unit)}` : t("Price") })}
          {rateSelect(it, idx, t("GST %"))}
          {showDiscount && num(it.discount_amount, (v) => update(idx, { discount_amount: v }), { label: t("Discount ₹") })}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} />}
            label={<Typography variant="caption">{t("Price includes GST")}</Typography>}
          />
        </Box>
        <Box sx={{ mt: 1 }}>{noteField(it, idx)}</Box>
      </Paper>
    );
  };

  const row = (it, idx) => {
    const l = calcLine(it, interstate);
    const weight = isWeightUnit(it.unit);
    return (
      <Box
        key={it.key}
        sx={{
          display: "grid",
          gridTemplateColumns: columns,
          columnGap: 1,
          rowGap: 1,
          alignItems: "start",
          py: 1.25,
          px: 1,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" sx={{ pt: 1 }}>
          {idx + 1}
        </Typography>
        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <ProductSelect item={it} storeId={storeId} onPick={(p) => pick(idx, p)} onText={(v) => update(idx, { product_name: v, product_id: null })} />
          {(notesOpen[it.key] || it.item_note) && noteField(it, idx)}
          {(it.hsn_code || weight) && (
            <Typography variant="caption" color="text.secondary">
              {[it.hsn_code && `HSN ${it.hsn_code}`, weight && t("Loose / by weight")].filter(Boolean).join(" · ")}
            </Typography>
          )}
        </Box>
        {weight ? (
          <Typography variant="body2" sx={{ pt: 1, fontWeight: 600, color: Number(it.quantity) > 0 ? "text.primary" : "warning.main" }}>
            {Number(it.quantity) > 0 ? gramsLabel(Number(it.quantity) * gramsPerUnit(it.unit), it.unit) : t("Set weight")}
          </Typography>
        ) : (
          <Box sx={{ maxWidth: 110 }}>{num(it.quantity, (v) => update(idx, { quantity: v }))}</Box>
        )}
        <Box>
          {num(it.unit_price, (v) => update(idx, { unit_price: v }))}
          {weight && (
            <Typography variant="caption" color="text.secondary">
              {t("per")} {rateSuffix(it.unit).slice(1)}
            </Typography>
          )}
        </Box>
        {showDiscount && num(it.discount_amount, (v) => update(idx, { discount_amount: v }))}
        {rateSelect(it, idx)}
        <Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} slotProps={{ input: { "aria-label": t("Price includes GST") } }} />
        <Box sx={{ textAlign: "right", pt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(l.total, { symbol: false })}
          </Typography>
          {l.tax > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              GST {formatCurrency(l.tax, { symbol: false })}
            </Typography>
          )}
        </Box>
        <Box sx={{ whiteSpace: "nowrap" }}>
          <Tooltip title={t("Add note")}>
            <IconButton size="small" onClick={() => setNotesOpen((n) => ({ ...n, [it.key]: !n[it.key] }))}>
              <NotesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Remove")}>
            <IconButton size="small" color="error" onClick={() => remove(idx)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {weight && <Box sx={{ gridColumn: "2 / -1", maxWidth: 640 }}>{measure(it, idx)}</Box>}
      </Box>
    );
  };

  return (
    <Box ref={boxRef}>
      {quickPick && <QuickItems storeId={storeId} onPick={quickAdd} />}
      {wide ? (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: columns,
              gap: 1,
              px: 1,
              py: 1,
              bgcolor: "action.hover",
              "& > *": { fontWeight: 700, fontSize: 14 },
            }}
          >
            <span>#</span>
            <span>{t("Item")}</span>
            <span>{anyWeight ? t("Qty / Weight") : t("Qty")}</span>
            <span style={{ textAlign: "right" }}>{t("Price")}</span>
            {showDiscount && <span style={{ textAlign: "right" }}>{t("Disc. ₹")}</span>}
            <span>{t("GST")}</span>
            <Tooltip title={t("Price includes GST")}>
              <span>{t("Incl.")}</span>
            </Tooltip>
            <span style={{ textAlign: "right" }}>{t("Amount")}</span>
            <span />
          </Box>
          {items.map(row)}
        </Paper>
      ) : (
        items.map(card)
      )}
      <Button startIcon={<AddIcon />} onClick={add} variant={wide ? "text" : "outlined"} fullWidth={!wide} sx={{ mt: 1 }}>
        {t("Add Item")}
      </Button>
    </Box>
  );
}
