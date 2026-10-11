import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import DataTable from "../../components/common/DataTable";
import useServerTable from "../../hooks/useServerTable";
import { InventoryServices } from "../../services/InventoryServices";
import { formatDate, formatNumber, formatTime } from "../../utils/format";

const LABELS = { purchase: "Purchase", sale: "Sale", return: "Return", adjustment: "Adjustment", damage: "Damage", opening: "Opening", cancel: "Bill cancelled" };

function History({ product }) {
  const table = useServerTable((p, s) => InventoryServices.getMovements(p, s, { product_id: product.product_id }), { pageSize: 25, idField: "movement_id" });
  const columns = [
    { field: "created_at", headerName: "Date", minWidth: 140, valueFormatter: (v) => `${formatDate(v)} ${formatTime(v)}` },
    { field: "movement_type", headerName: "Type", minWidth: 110, valueFormatter: (v) => LABELS[v] || v },
    {
      field: "quantity",
      headerName: "Qty",
      minWidth: 80,
      type: "number",
      renderCell: ({ value }) => (
        <Typography variant="body2" color={value < 0 ? "error" : "success.main"} sx={{ fontWeight: 700 }}>
          {value > 0 ? "+" : ""}
          {formatNumber(value, 3)}
        </Typography>
      ),
    },
    { field: "balance_after", headerName: "Balance", minWidth: 90, type: "number", valueFormatter: (v) => formatNumber(v, 3) },
    { field: "reference_number", headerName: "Ref", minWidth: 120, valueGetter: (v, row) => v || row.notes || "" , flex: 1 },
    { field: "user_name", headerName: "By", minWidth: 100 },
  ];
  return <DataTable table={table} columns={columns} height={460} mobileHidden={["user_name"]} />;
}

export default function StockHistoryDialog({ product, open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Stock history · {product?.name}</DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>{product && <History product={product} />}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
