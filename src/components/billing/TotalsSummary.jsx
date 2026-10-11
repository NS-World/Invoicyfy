import { Box, Divider, Typography } from "@mui/material";
import { formatCurrency, formatNumber } from "../../utils/format";

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
export default function TotalsSummary({ t, interstate }) {
  return (
    <Box>
      <Row label={`Items (${formatNumber(t.qty, 3)} qty)`} value={formatCurrency(t.subtotal)} />
      {t.discount > 0 && <Row label="Discount" value={`- ${formatCurrency(t.discount)}`} color="success.main" />}
      <Row label="Taxable value" value={formatCurrency(t.taxable)} />
      {interstate ? (
        <Row label="IGST" value={formatCurrency(t.igst)} />
      ) : (
        <>
          <Row label="CGST" value={formatCurrency(t.cgst)} />
          <Row label="SGST" value={formatCurrency(t.sgst)} />
        </>
      )}
      {t.roundOff !== 0 && <Row label="Round off" value={formatCurrency(t.roundOff)} />}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Grand Total
        </Typography>
        <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
          {formatCurrency(t.total)}
        </Typography>
      </Box>
    </Box>
  );
}
