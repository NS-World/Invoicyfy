import { useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import ListExport from "../../components/common/ListExport";
import StatCard from "../../components/common/StatCard";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useServerTable from "../../hooks/useServerTable";
import { PurchaseServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { datePresets, formatCurrency, formatDate } from "../../utils/format";
import PurchaseView from "./PurchaseView";

const STATUS_COLOR = { Paid: "success", Partial: "warning", Unpaid: "error", Cancelled: "default" };

export default function Purchases() {
  const t = useT();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [status, setStatus] = useState("");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const [view, setView] = useState(null);
  const table = useServerTable((p, s, q, f) => PurchaseServices.list(p, s, q, f), { idField: "purchase_id", pageSize: 25, filters: { store_id: storeId, status, ...range } });
  const sum = table.response?.summary;

  const columns = [
    { field: "purchase_date", headerName: "Date", minWidth: 105, valueFormatter: (v) => formatDate(v) },
    { field: "supplier_name", headerName: "Supplier", minWidth: 160, flex: 1.3 },
    { field: "bill_no", headerName: "Bill no.", minWidth: 110, valueFormatter: (v) => v || "—" },
    { field: "item_count", headerName: "Items", width: 70, type: "number" },
    { field: "tax_amount", headerName: "GST", minWidth: 100, type: "number", valueFormatter: (v) => formatCurrency(v) },
    { field: "total_amount", headerName: "Total", minWidth: 115, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
    { field: "balance_due", headerName: "Balance", minWidth: 110, type: "number", valueFormatter: (v) => formatCurrency(v) },
    { field: "status", headerName: "Status", minWidth: 105, renderCell: ({ value }) => <Chip size="small" label={t(value)} color={STATUS_COLOR[value]} /> },
  ];

  return (
    <>
      <PageHeader
        title="Purchase bills"
        subtitle="Goods bought from suppliers"
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            <Button variant="outlined" onClick={() => navigate("/suppliers")}>
              {t("Suppliers")}
            </Button>
            {can("purchases", "add") && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/purchases/new")}>
                {t("New purchase")}
              </Button>
            )}
          </>
        }
      />
      <Grid container data-tour="screen-main" spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Purchases in period" value={formatCurrency(sum?.total || 0)} loading={!table.response} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard label="GST paid (input credit)" value={formatCurrency(sum?.input_tax || 0)} color="success.main" loading={!table.response} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard label="Still to pay" value={formatCurrency(sum?.due || 0)} color="error.main" loading={!table.response} onClick={() => setStatus("due")} />
        </Grid>
      </Grid>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search bill no. or supplier")} />
        <TextField select label={t("Status")} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          <MenuItem value="due">{t("To pay")}</MenuItem>
          {["Paid", "Partial", "Unpaid", "Cancelled"].map((s) => (
            <MenuItem key={s} value={s}>
              {t(s)}
            </MenuItem>
          ))}
        </TextField>
        <DateRangeFilter value={range} onChange={setRange} />
        <Box sx={{ flex: 1 }} />
        <ListExport
          table={table}
          title={t("Purchase bills")}
          filename="purchases"
          subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
          columns={[
            { label: "Date", key: "purchase_date", type: "date" },
            { label: "Supplier", key: "supplier_name" },
            { label: "Bill no.", key: "bill_no" },
            { label: "Taxable", key: "taxable_amount", type: "money" },
            { label: "GST", key: "tax_amount", type: "money" },
            { label: "Total", key: "total_amount", type: "money" },
            { label: "Paid", key: "amount_paid", type: "money" },
            { label: "Balance", key: "balance_due", type: "money" },
            { label: "Status", key: "status" },
          ]}
        />
      </Toolbar>
      <DataTable table={table} columns={columns} onRowClick={(p) => setView(p.row.purchase_id)} mobileHidden={["bill_no", "item_count", "tax_amount", "balance_due"]} />
      {view && <PurchaseView purchaseId={view} onClose={() => setView(null)} onChanged={table.reload} />}
    </>
  );
}
