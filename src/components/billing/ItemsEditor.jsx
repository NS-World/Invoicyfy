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
  ToggleButton,
  ToggleButtonGroup,
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
import { gramsLabel, gramsPerUnit, isWeightUnit, parsePresets, rateSuffix } from "../../utils/weight";

function ProductSelect({ item, onPick, onText, storeId, autoFocus }) {
  const [input, setInput] = useState(item.product_name || "");
  const [options, setOptions] = useState([]);
  const term = useDebounce(input, 250);

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
                  {[o.sku, o.hsn_code && `HSN ${o.hsn_code}`, `GST ${formatNumber(o.gst_rate)}%`, weight && "sold by weight"].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {formatCurrency(o.price)}
                  {rateSuffix(o.unit)}
                </Typography>
                {Boolean(o.track_inventory) && (
                  <Typography variant="caption" color={low ? "error" : "text.secondary"} sx={{ whiteSpace: "nowrap" }}>
                    Stock {formatNumber(o.stock_qty, 3)} {o.unit}
                  </Typography>
                )}
              </Box>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} placeholder="Search product or type item name" autoFocus={autoFocus} />}
    />
  );
}

/** Gram presets (100 g, 250 g ...) + quantity typed in g or kg for items sold by weight. */
function WeightPicker({ item, onChange }) {
  const factor = gramsPerUnit(item.unit);
  const grams = Math.round((Number(item.quantity) || 0) * factor * 1000) / 1000;
  const entry = item.qty_entry === "kg" ? "kg" : "g";
  const shown = item.quantity === "" ? "" : entry === "g" ? grams : grams / 1000;
  const setGrams = (g) => onChange({ quantity: g === "" ? "" : Math.round((g / factor) * 1000) / 1000 });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {parsePresets(item.weight_presets).map((g) => (
          <Chip
            key={g}
            label={gramsLabel(g)}
            size="small"
            color={Math.abs(grams - g) < 0.001 ? "primary" : "default"}
            variant={Math.abs(grams - g) < 0.001 ? "filled" : "outlined"}
            onClick={() => setGrams(g)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          type="number"
          label="Weight"
          value={shown}
          onChange={(e) => setGrams(e.target.value === "" ? "" : Number(e.target.value) * (entry === "g" ? 1 : 1000))}
          onFocus={(e) => e.target.select()}
          slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal", style: { textAlign: "right" } } }}
          sx={{ flex: 1, minWidth: 90 }}
        />
        <ToggleButtonGroup exclusive size="small" value={entry} onChange={(_, v) => v && onChange({ qty_entry: v })}>
          <ToggleButton value="g" sx={{ px: 1.25 }}>
            g
          </ToggleButton>
          <ToggleButton value="kg" sx={{ px: 1.25 }}>
            kg
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}

/**
 * Line items editor. Lays itself out by the width it actually gets (sidebar open or collapsed, tablet, phone):
 * a table when there is room, otherwise one card per item.
 */
export default function ItemsEditor({ items, onChange, interstate, storeId, showDiscount = true }) {
  const meta = useMeta();
  const [boxRef, width] = useElementWidth();
  const [notesOpen, setNotesOpen] = useState({});
  const anyWeight = items.some((it) => isWeightUnit(it.unit));
  // Table needs ~860px (or ~1090px with the weight picker column); below that each item becomes a card.
  const wide = width >= (anyWeight ? 1090 : 860);
  const columns = `28px minmax(220px, 1fr) ${anyWeight ? "250px" : "90px"} 110px ${showDiscount ? "90px " : ""}90px 44px 110px 72px`;

  const update = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx) => onChange(items.length === 1 ? [emptyItem()] : items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, emptyItem()]);

  const pick = (idx, p) => {
    const weight = isWeightUnit(p.unit);
    update(idx, {
      product_id: p.product_id,
      product_name: p.name,
      hsn_code: p.hsn_code || "",
      unit: p.unit || "pcs",
      unit_price: Number(p.price) || 0,
      gst_rate: Number(p.gst_rate) || 0,
      price_includes_tax: Boolean(Number(p.price_includes_tax)),
      weight_presets: p.weight_presets || null,
      // Weight items start empty so the cashier taps a preset or types the weight.
      quantity: weight ? "" : items[idx].quantity || 1,
      qty_entry: "g",
    });
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
    <TextField fullWidth placeholder="Item note (e.g. Dry Fruits: Pista - 1x50 = 50)" value={it.item_note} onChange={(e) => update(idx, { item_note: e.target.value })} />
  );

  const weightSummary = (it, l) =>
    isWeightUnit(it.unit) && Number(it.quantity) > 0 ? (
      <Typography variant="caption" color="text.secondary">
        {gramsLabel(Number(it.quantity) * gramsPerUnit(it.unit))} × {formatCurrency(it.unit_price)}
        {rateSuffix(it.unit)} = {formatCurrency(l.gross)}
      </Typography>
    ) : null;

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
          {weight && <Chip size="small" icon={<ScaleIcon />} label="By weight" variant="outlined" />}
          <Box sx={{ flex: 1 }} />
          <Typography variant="subtitle2">{formatCurrency(l.total)}</Typography>
          <IconButton size="small" color="error" onClick={() => remove(idx)} aria-label="Remove item">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
        <ProductSelect item={it} storeId={storeId} onPick={(p) => pick(idx, p)} onText={(v) => update(idx, { product_name: v, product_id: null })} />
        {weight && (
          <Box sx={{ mt: 1.5 }}>
            <WeightPicker item={it} onChange={(patch) => update(idx, patch)} />
          </Box>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1, mt: 1.5 }}>
          {!weight && num(it.quantity, (v) => update(idx, { quantity: v }), { label: `Qty (${it.unit || "pcs"})` })}
          {num(it.unit_price, (v) => update(idx, { unit_price: v }), { label: weight ? `Price ${rateSuffix(it.unit)}` : "Price" })}
          {rateSelect(it, idx, "GST %")}
          {showDiscount && num(it.discount_amount, (v) => update(idx, { discount_amount: v }), { label: "Discount ₹" })}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} />}
            label={<Typography variant="caption">Price includes GST</Typography>}
          />
          {weightSummary(it, l)}
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
          gap: 1,
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
              {[it.hsn_code && `HSN ${it.hsn_code}`, weight && "Sold by weight"].filter(Boolean).join(" · ")}
            </Typography>
          )}
        </Box>
        {weight ? <WeightPicker item={it} onChange={(patch) => update(idx, patch)} /> : <Box sx={{ maxWidth: 110 }}>{num(it.quantity, (v) => update(idx, { quantity: v }))}</Box>}
        <Box>
          {num(it.unit_price, (v) => update(idx, { unit_price: v }))}
          {weight && (
            <Typography variant="caption" color="text.secondary">
              per {rateSuffix(it.unit).slice(1)}
            </Typography>
          )}
        </Box>
        {showDiscount && num(it.discount_amount, (v) => update(idx, { discount_amount: v }))}
        {rateSelect(it, idx)}
        <Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} inputProps={{ "aria-label": "Price includes GST" }} />
        <Box sx={{ textAlign: "right", pt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(l.total, { symbol: false })}
          </Typography>
          {l.tax > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              GST {formatCurrency(l.tax, { symbol: false })}
            </Typography>
          )}
          {weight && Number(it.quantity) > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              {gramsLabel(Number(it.quantity) * gramsPerUnit(it.unit))}
            </Typography>
          )}
        </Box>
        <Box sx={{ whiteSpace: "nowrap" }}>
          <Tooltip title="Add note">
            <IconButton size="small" onClick={() => setNotesOpen((n) => ({ ...n, [it.key]: !n[it.key] }))}>
              <NotesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton size="small" color="error" onClick={() => remove(idx)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  return (
    <Box ref={boxRef}>
      {wide ? (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: columns,
              gap: 1,
              px: 1,
              py: 1,
              bgcolor: "#f8fafc",
              "& > *": { fontWeight: 700, fontSize: 14 },
            }}
          >
            <span>#</span>
            <span>Item</span>
            <span style={{ textAlign: anyWeight ? "left" : "right" }}>{anyWeight ? "Qty / Weight" : "Qty"}</span>
            <span style={{ textAlign: "right" }}>Price</span>
            {showDiscount && <span style={{ textAlign: "right" }}>Disc. ₹</span>}
            <span>GST</span>
            <Tooltip title="Price includes GST">
              <span>Incl.</span>
            </Tooltip>
            <span style={{ textAlign: "right" }}>Amount</span>
            <span />
          </Box>
          {items.map(row)}
        </Paper>
      ) : (
        items.map(card)
      )}
      <Button startIcon={<AddIcon />} onClick={add} variant={wide ? "text" : "outlined"} fullWidth={!wide} sx={{ mt: 1 }}>
        Add Item
      </Button>
    </Box>
  );
}
