import { useEffect, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { ProductServices } from "../../services/ProductServices";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { rateSuffix } from "../../utils/weight";

/** One-tap buttons for the best-selling products, so the counter can bill without searching. */
export default function QuickItems({ storeId, onPick, limit = 12 }) {
  const t = useT();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let live = true;
    ProductServices.getProductsData(0, limit, "", { status: "Active", store_id: storeId, sort: "popular" })
      .then((r) => live && setItems(r.data || []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [storeId, limit]);

  if (!items.length) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
        <BoltIcon sx={{ fontSize: 16 }} /> {t("Quick items — tap to add")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(150px, 1fr))" },
          gap: 1,
        }}
      >
        {items.map((p) => (
          <ButtonBase
            key={p.product_id}
            onClick={() => onPick(p)}
            sx={{
              display: "block",
              textAlign: "left",
              p: 1,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }} noWrap title={p.name}>
              {p.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(p.price)}
              {rateSuffix(p.unit)}
            </Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
