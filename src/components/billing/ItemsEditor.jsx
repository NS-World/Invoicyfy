import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import NotesIcon from "@mui/icons-material/StickyNote2Outlined";
import { ProductServices } from "../../services/ProductServices";
import useDebounce from "../../hooks/useDebounce";
import useMeta from "../../hooks/useMeta";
import { calcLine, emptyItem } from "../../utils/gst";
import { formatCurrency, formatNumber } from "../../utils/format";

function ProductSelect({ item, onPick, onText, storeId }) {
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
      renderOption={(props, o) => {
        const { key, ...rest } = props;
        const low = o.track_inventory && Number(o.stock_qty) <= Number(o.low_stock_threshold);
        return (
          <li key={key} {...rest}>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {o.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[o.sku, o.hsn_code && `HSN ${o.hsn_code}`, `GST ${formatNumber(o.gst_rate)}%`].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography variant="body2">{formatCurrency(o.price)}</Typography>
                {Boolean(o.track_inventory) && (
                  <Typography variant="caption" color={low ? "error" : "text.secondary"}>
                    Stock {formatNumber(o.stock_qty, 3)}
                  </Typography>
                )}
              </Box>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} placeholder="Search product or type item name" />}
    />
  );
}

/** Line items editor: table on desktop, stacked cards on phones. */
export default function ItemsEditor({ items, onChange, interstate, storeId, showDiscount = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const meta = useMeta();
  const [notesOpen, setNotesOpen] = useState({});

  const update = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx) => onChange(items.length === 1 ? [emptyItem()] : items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, emptyItem()]);

  const pick = (idx, p) =>
    update(idx, {
      product_id: p.product_id,
      product_name: p.name,
      hsn_code: p.hsn_code || "",
      unit: p.unit || "pcs",
      unit_price: Number(p.price) || 0,
      gst_rate: Number(p.gst_rate) || 0,
      price_includes_tax: Boolean(Number(p.price_includes_tax)),
    });

  const rateSelect = (it, idx) => (
    <TextField select value={Number(it.gst_rate)} onChange={(e) => update(idx, { gst_rate: Number(e.target.value) })} fullWidth label={isMobile ? "GST %" : undefined}>
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
    <TextField
      fullWidth
      placeholder="Item note (e.g. Dry Fruits: Pista - 1x50 = 50)"
      value={it.item_note}
      onChange={(e) => update(idx, { item_note: e.target.value })}
      sx={{ mt: 1 }}
    />
  );

  if (isMobile) {
    return (
      <Box>
        {items.map((it, idx) => {
          const l = calcLine(it, interstate);
          return (
            <Paper key={it.key} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  #{idx + 1}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="subtitle2">{formatCurrency(l.total)}</Typography>
                <IconButton size="small" color="error" onClick={() => remove(idx)} aria-label="Remove item">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <ProductSelect item={it} storeId={storeId} onPick={(p) => pick(idx, p)} onText={(v) => update(idx, { product_name: v, product_id: null })} />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>
                {num(it.quantity, (v) => update(idx, { quantity: v }), { label: `Qty (${it.unit || "pcs"})` })}
                {num(it.unit_price, (v) => update(idx, { unit_price: v }), { label: "Price" })}
                {rateSelect(it, idx)}
                {showDiscount && num(it.discount_amount, (v) => update(idx, { discount_amount: v }), { label: "Discount ₹" })}
              </Box>
              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={<Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} />}
                label={<Typography variant="caption">Price includes GST</Typography>}
              />
              {noteField(it, idx)}
            </Paper>
          );
        })}
        <Button startIcon={<AddIcon />} onClick={add} variant="outlined" fullWidth>
          Add Item
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ "& td, & th": { px: 1 }, minWidth: 820 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 32 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }} align="right">
                Qty
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }} align="right">
                Price
              </TableCell>
              {showDiscount && (
                <TableCell sx={{ fontWeight: 700, width: 95 }} align="right">
                  Disc. ₹
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 700, width: 95 }}>GST</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 60 }} align="center">
                <Tooltip title="Price includes GST">
                  <span>Incl.</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ width: 76 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => {
              const l = calcLine(it, interstate);
              return (
                <TableRow key={it.key} sx={{ verticalAlign: "top" }}>
                  <TableCell sx={{ pt: 2 }}>{idx + 1}</TableCell>
                  <TableCell>
                    <ProductSelect item={it} storeId={storeId} onPick={(p) => pick(idx, p)} onText={(v) => update(idx, { product_name: v, product_id: null })} />
                    {(notesOpen[it.key] || it.item_note) && noteField(it, idx)}
                    {it.hsn_code && (
                      <Typography variant="caption" color="text.secondary">
                        HSN {it.hsn_code}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{num(it.quantity, (v) => update(idx, { quantity: v }))}</TableCell>
                  <TableCell>{num(it.unit_price, (v) => update(idx, { unit_price: v }))}</TableCell>
                  {showDiscount && <TableCell>{num(it.discount_amount, (v) => update(idx, { discount_amount: v }))}</TableCell>}
                  <TableCell>{rateSelect(it, idx)}</TableCell>
                  <TableCell align="center">
                    <Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(idx, { price_includes_tax: e.target.checked })} />
                  </TableCell>
                  <TableCell align="right" sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(l.total, { symbol: false })}
                    </Typography>
                    {l.tax > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        GST {formatCurrency(l.tax, { symbol: false })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1 }}>
        Add Item
      </Button>
    </Box>
  );
}
