import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { formatCurrency } from "../../utils/format";

/** Simple responsive table with optional totals row. cols: [{ key, label, money?, align?, format? }] */
export default function ReportTable({ cols, rows, totals, emptyText = "No data for this period" }) {
  const fmt = (c, v) => (c.format ? c.format(v) : c.money ? formatCurrency(v, { symbol: false }) : v ?? "");
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" sx={{ minWidth: Math.max(500, cols.length * 110) }}>
        <TableHead sx={{ bgcolor: "action.hover" }}>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={i} hover>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"} sx={{ whiteSpace: "nowrap" }}>
                  {fmt(c, r[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {totals && rows.length > 0 && (
            <TableRow sx={{ "& td": { fontWeight: 800, bgcolor: "action.hover" } }}>
              {cols.map((c, i) => (
                <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"}>
                  {i === 0 ? "Total" : totals[c.key] !== undefined ? fmt(c, totals[c.key]) : ""}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
