import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import { useT } from "../../context/PrefsContext";
import { BLOCK_POSITIONS } from "../../utils/invoiceSettings";

/** Slider that can go back to "Auto" (the template's own value). */
function LayoutSlider({ label, value, auto, min, max, step = 1, unit = "", onChange }) {
  const t = useT();
  const isAuto = value === null || value === undefined || value === "";
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2">{t(label)}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {isAuto ? `${t("Auto")} (${auto}${unit})` : `${value}${unit}`}
          </Typography>
          {!isAuto && (
            <Button size="small" onClick={() => onChange(null)} sx={{ minWidth: 0, px: 0.75 }}>
              {t("Auto")}
            </Button>
          )}
        </Box>
      </Box>
      <Slider size="small" min={min} max={max} step={step} value={isAuto ? auto : Number(value)} onChange={(_, v) => onChange(v)} />
    </Box>
  );
}

const RECEIPT_SLIDERS = [
  ["receipt_font_size", "Text size", 12, 8, 20, 0.5, "px"],
  ["receipt_line_height", "Line spacing", 1.35, 1, 2.2, 0.05, ""],
  ["receipt_padding", "Paper margin", 3, 0, 10, 0.5, "mm"],
  ["receipt_store_name_size", "Shop name size", 1.35, 0.8, 3, 0.05, "×"],
  ["receipt_logo_width", "Logo width", 35, 15, 70, 1, "mm"],
  ["receipt_col_qty", "Qty column width", 7, 4, 14, 0.5, "ch"],
  ["receipt_col_price", "Price column width", 9.5, 5, 16, 0.5, "ch"],
  ["receipt_col_amount", "Amount column width", 8.5, 5, 16, 0.5, "ch"],
];
const A4_SLIDERS = [
  ["a4_font_size", "Text size", 10.5, 8, 15, 0.5, "px"],
  ["a4_padding", "Page margin", 0, 0, 20, 1, "mm"],
  ["a4_cell_padding", "Table cell spacing", 3, 1, 10, 0.5, "px"],
  ["a4_title_size", "Title size", 18, 12, 36, 1, "px"],
  ["a4_logo_height", "Logo height", 46, 20, 120, 2, "px"],
];

export function LayoutControls({ kind, settings, set }) {
  const t = useT();
  const sliders = kind === "a4" ? A4_SLIDERS : RECEIPT_SLIDERS;
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 3, rowGap: 0.5 }}>
        {sliders.map(([key, label, auto, min, max, step, unit]) => (
          <LayoutSlider key={key} label={label} value={settings[key]} auto={auto} min={min} max={max} step={step} unit={unit} onChange={(v) => set({ [key]: v })} />
        ))}
      </Box>
      {kind === "receipt" && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mt: 1 }}>
          <TextField select size="small" label={t("Separator line")} value={settings.receipt_separator || "solid"} onChange={(e) => set({ receipt_separator: e.target.value })} sx={{ minWidth: 150 }}>
            <MenuItem value="solid">{t("Solid")} ───</MenuItem>
            <MenuItem value="dashed">{t("Dashed")} - - -</MenuItem>
            <MenuItem value="dotted">{t("Dotted")} · · ·</MenuItem>
            <MenuItem value="double">{t("Double")} ═══</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch size="small" checked={settings.receipt_show_price_col !== false} onChange={(e) => set({ receipt_show_price_col: e.target.checked })} />} label={t("Price column")} />
          <FormControlLabel control={<Switch size="small" checked={Boolean(settings.receipt_bold_items)} onChange={(e) => set({ receipt_bold_items: e.target.checked })} />} label={t("Bold items")} />
          <FormControlLabel control={<Switch size="small" checked={settings.show_store_name !== false} onChange={(e) => set({ show_store_name: e.target.checked })} />} label={t("Shop name")} />
        </Box>
      )}
    </Box>
  );
}

const STARTERS = [
  "🎉 Thank you for visiting! Come again 😊",
  "🕙 Open daily 10 AM – 11 PM",
  "🛵 Free home delivery above ₹299 · Call 98XXXXXXXX",
  "⭐ Loved it? Review us on Google!",
  "🎁 Show this bill on your next visit for 10% OFF",
];
const EMOJIS = ["🍨", "🍦", "🎉", "😊", "⭐", "❤️", "🙏", "🎁", "🛵", "📞", "🕙", "✅", "🔥", "🥳", "🪔", "💐"];

/** Free text blocks with emoji, placed anywhere on the bill. */
export function BlocksEditor({ settings, set }) {
  const t = useT();
  const blocks = settings.custom_blocks || [];
  const update = (i, patch) => set({ custom_blocks: blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const move = (i, d) => {
    const list = [...blocks];
    [list[i], list[i + d]] = [list[i + d], list[i]];
    set({ custom_blocks: list });
  };
  const add = (text = "") => set({ custom_blocks: [...blocks, { text, position: "bottom", align: "center", size: "normal", bold: false, italic: false, boxed: false, show_on: "both" }] });

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t("Add your own lines anywhere on the bill — offers, timings, delivery number, thank-you note. Emoji are allowed.")}
      </Typography>
      {blocks.map((b, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={`${t("Text")} ${i + 1}`}
            value={b.text}
            onChange={(e) => update(i, { text: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", my: 1 }}>
            {EMOJIS.map((em) => (
              <Chip key={em} label={em} size="small" variant="outlined" onClick={() => update(i, { text: `${b.text}${em}` })} sx={{ fontSize: 16 }} />
            ))}
          </Box>
          <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth size="small" label={t("Position")} value={b.position} onChange={(e) => update(i, { position: e.target.value })}>
                {BLOCK_POSITIONS.map((p) => (
                  <MenuItem key={p.key} value={p.key}>
                    {t(p.label)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select fullWidth size="small" label={t("Size")} value={b.size} onChange={(e) => update(i, { size: e.target.value })}>
                <MenuItem value="small">{t("Small")}</MenuItem>
                <MenuItem value="normal">{t("Normal")}</MenuItem>
                <MenuItem value="large">{t("Large")}</MenuItem>
                <MenuItem value="xlarge">{t("Extra large")}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select fullWidth size="small" label={t("Print on")} value={b.show_on || "both"} onChange={(e) => update(i, { show_on: e.target.value })}>
                <MenuItem value="both">{t("Both")}</MenuItem>
                <MenuItem value="a4">A4</MenuItem>
                <MenuItem value="receipt">{t("Receipt")}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <ToggleButtonGroup size="small" exclusive value={b.align} onChange={(_, v) => v && update(i, { align: v })}>
                  <ToggleButton value="left" aria-label={t("Left")}>
                    <FormatAlignLeftIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="center" aria-label={t("Center")}>
                    <FormatAlignCenterIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="right" aria-label={t("Right")}>
                    <FormatAlignRightIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
                <FormControlLabel control={<Switch size="small" checked={b.bold} onChange={(e) => update(i, { bold: e.target.checked })} />} label={t("Bold")} />
                <FormControlLabel control={<Switch size="small" checked={b.italic} onChange={(e) => update(i, { italic: e.target.checked })} />} label={t("Italic")} />
                <FormControlLabel control={<Switch size="small" checked={b.boxed} onChange={(e) => update(i, { boxed: e.target.checked })} />} label={t("Box")} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title={t("Move up")}>
                  <span>
                    <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("Move down")}>
                  <span>
                    <IconButton size="small" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("Remove")}>
                  <IconButton size="small" color="error" onClick={() => set({ custom_blocks: blocks.filter((_, j) => j !== i) })}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      ))}
      {blocks.length < 12 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => add()}>
            {t("Add text block")}
          </Button>
          {STARTERS.filter((x) => !blocks.some((b) => b.text === x)).slice(0, 3).map((x) => (
            <Chip key={x} label={`+ ${x}`} variant="outlined" onClick={() => add(x)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
