import { useMemo, useState } from "react";
import { Alert, Badge, Box, Button, ButtonBase, IconButton, InputAdornment, Skeleton, Tab, Tabs, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import ScaleIcon from "@mui/icons-material/Scale";
import AddIcon from "@mui/icons-material/Add";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { isWeightUnit, rateSuffix } from "../../utils/weight";
import { qtyOnBill } from "../../utils/billItems";

const TAB_KEY = "billingTab";
const PALETTE = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#15803d", "#c2410c", "#0e7490", "#a21caf", "#4d7c0f"];
const readTab = () => {
  try {
    return localStorage.getItem(TAB_KEY);
  } catch {
    return null;
  }
};

/**
 * Product picker for the counter: category tabs, a search box (name / SKU / barcode, Enter adds) and big
 * product tiles. Tapping a tile adds it to the bill; loose items ask for weight / amount next.
 */
export default function ProductCatalog({ catalog, items, onPick, onCustom, height }) {
  const t = useT();
  const { products, categories, popular, loading, error } = catalog;
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(readTab);

  const colorOf = useMemo(() => {
    const m = {};
    categories.forEach((c, i) => (m[c.name] = PALETTE[i % PALETTE.length]));
    return m;
  }, [categories]);

  const tabs = useMemo(
    () => [
      ...(popular.length ? [{ key: "__popular", label: t("Popular"), icon: <StarIcon sx={{ fontSize: 16 }} />, count: popular.length }] : []),
      { key: "__all", label: t("All"), count: products.length },
      ...categories.map((c) => ({ key: `c:${c.name}`, label: c.name || t("Other"), count: c.count, color: colorOf[c.name] })),
    ],
    [popular, products, categories, colorOf, t]
  );
  const current = tabs.some((x) => x.key === tab) ? tab : tabs[0]?.key;

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    if (q) {
      return products
        .filter((p) => [p.name, p.sku, p.category, p.hsn_code].some((v) => v && String(v).toLowerCase().includes(q)))
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
    }
    if (current === "__popular") return popular.map((id) => products.find((p) => p.product_id === id)).filter(Boolean);
    if (current === "__all") return products;
    const name = current?.slice(2) ?? "";
    return products.filter((p) => (p.category || "") === name);
  }, [q, current, products, popular]);

  const chooseTab = (key) => {
    setTab(key);
    setSearch("");
    try {
      localStorage.setItem(TAB_KEY, key);
    } catch {
      /* private mode */
    }
  };

  const pick = (p) => {
    onPick(p);
    if (q) setSearch("");
  };

  const onKey = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    // Barcode scanners type the SKU and press Enter.
    const exact = products.find((p) => p.sku && p.sku.toLowerCase() === q);
    if (exact) return pick(exact);
    if (shown.length === 1) pick(shown[0]);
  };

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={onKey}
        placeholder={t("Search product, SKU or scan barcode")}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")} aria-label={t("Clear")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1 }}
      />
      {!q && tabs.length > 1 && (
        <Tabs
          value={current}
          onChange={(_, v) => chooseTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            mb: 1,
            "& .MuiTab-root": { minHeight: 40, py: 0.5, px: 1.5, textTransform: "none", fontWeight: 600 },
          }}
        >
          {tabs.map((x) => (
            <Tab
              key={x.key}
              value={x.key}
              iconPosition="start"
              icon={x.icon || (x.color ? <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: x.color }} /> : undefined)}
              label={`${x.label} (${x.count})`}
            />
          ))}
        </Tabs>
      )}
      {q && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {shown.length ? t("{n} product(s) found — tap to add, Enter adds when only one", { n: shown.length }) : t("No product found")}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ maxHeight: height || { xs: 380, md: 460, lg: "calc(100vh - 340px)" }, minHeight: 200, overflowY: "auto", pr: 0.5, pb: 0.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(140px, 1fr))" }, gap: 1 }}>
          {loading &&
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}
          {shown.map((p) => {
            const loose = isWeightUnit(p.unit);
            const onBill = qtyOnBill(items, p.product_id);
            const out = Boolean(Number(p.track_inventory)) && Number(p.stock_qty) <= 0;
            const color = colorOf[p.category || ""] || "divider";
            return (
              <Badge key={p.product_id} badgeContent={onBill ? (loose ? `×${onBill}` : onBill) : 0} color="primary" sx={{ display: "block", "& .MuiBadge-badge": { right: 10, top: 6, fontWeight: 700 } }}>
                <ButtonBase
                  onClick={() => pick(p)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: 72,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    justifyContent: "space-between",
                    textAlign: "left",
                    p: 1,
                    pl: 1.25,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: onBill ? "primary.main" : "divider",
                    borderLeft: "4px solid",
                    borderLeftColor: color,
                    bgcolor: onBill ? "action.selected" : "background.paper",
                    "&:hover": { bgcolor: "action.hover" },
                    "&:active": { transform: "scale(0.98)" },
                  }}
                >
                  <Typography
                    variant="body2"
                    title={p.name}
                    sx={{ fontWeight: 600, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", pr: onBill ? 2 : 0 }}
                  >
                    {p.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      {formatCurrency(p.price)}
                      {rateSuffix(p.unit)}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {loose && <ScaleIcon sx={{ fontSize: 16, color: "text.secondary" }} titleAccess={t("Loose / by weight")} />}
                    {out && (
                      <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                        {t("No stock")}
                      </Typography>
                    )}
                  </Box>
                </ButtonBase>
              </Badge>
            );
          })}
        </Box>
        {!loading && !shown.length && !q && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
            {t("No products in this category yet.")}
          </Typography>
        )}
      </Box>
      {onCustom && (
        <Button size="small" startIcon={<AddIcon />} onClick={() => onCustom(search.trim())} sx={{ mt: 1 }}>
          {q ? t("Add \"{name}\" as a new item", { name: search.trim() }) : t("Item not in list")}
        </Button>
      )}
    </Box>
  );
}
