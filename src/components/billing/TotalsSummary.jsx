import { Box, Divider, Typography } from "@mui/material";
import { formatCurrency } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

const Row = ({ label, value, bold, color }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
    <Typography variant="body2" color={color || "text.secondary"} sx={{ fontWeight: bold ? 700 : 400 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 500 }} color={color}>
      {value}
    </Typography>
  </Box>
);

/** t = calcTotals(...) result */
export default function TotalsSummary({ t: totals, interstate }) {
  const t = useT();
  return (
    <Box>
      <Row label={`${totals.count} ${totals.count === 1 ? t("item") : t("items")}`} value={formatCurrency(totals.subtotal)} />
      {totals.discount > 0 && <Row label={t("Discount")} value={`- ${formatCurrency(totals.discount)}`} color="success.main" />}
      <Row label={t("Taxable value")} value={formatCurrency(totals.taxable)} />
      {interstate ? (
        <Row label={t("IGST")} value={formatCurrency(totals.igst)} />
      ) : (
        <>
          <Row label={t("CGST")} value={formatCurrency(totals.cgst)} />
          <Row label={t("SGST")} value={formatCurrency(totals.sgst)} />
        </>
      )}
      {totals.roundOff !== 0 && <Row label={t("Round off")} value={formatCurrency(totals.roundOff)} />}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("Grand Total")}
        </Typography>
        <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
          {formatCurrency(totals.total)}
        </Typography>
      </Box>
    </Box>
  );
}
