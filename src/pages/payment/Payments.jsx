import { useState } from "react";
import { Box, Chip, MenuItem, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ListExport from "../../components/common/ListExport";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { PaymentServices } from "../../services/PaymentServices";
import useServerTable from "../../hooks/useServerTable";
import useMeta from "../../hooks/useMeta";
import { datePresets, formatCurrency, formatDate } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Payments() {
  const t = useT();
  const navigate = useNavigate();
  const meta = useMeta();
  const [method, setMethod] = useState("");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const table = useServerTable((p, s, q, f) => PaymentServices.getPayments(p, s, q, f), {
    filters: { payment_method: method, ...range },
    idField: "payment_id",
  });
  const summary = table.response?.summary;

  const columns = [
    { field: "payment_date", headerName: "Date", minWidth: 110, valueFormatter: (v) => formatDate(v) },
    { field: "invoice_number", headerName: "Invoice", minWidth: 130, flex: 1 },
    { field: "customer_name", headerName: "Customer", minWidth: 160, flex: 1.2, valueFormatter: (v) => v || "Walk-in" },
    { field: "payment_method", headerName: "Mode", minWidth: 110 },
    { field: "reference_no", headerName: "Reference", minWidth: 130, flex: 1 },
    { field: "amount", headerName: "Amount", minWidth: 120, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
    { field: "received_by", headerName: "Received By", minWidth: 120 },
  ];

  return (
    <>
      <PageHeader title={t("Payments Received")} subtitle={summary ? `Total ${formatCurrency(summary.total_amount)}` : " "} />
      {summary?.by_method?.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {summary.by_method.map((m) => (
            <Chip key={m.payment_method} label={`${m.payment_method}: ${formatCurrency(m.amount)}`} variant="outlined" color="primary" />
          ))}
        </Box>
      )}
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Invoice, customer, reference")} />
        <TextField select label={t("Mode")} value={method} onChange={(e) => setMethod(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          {meta.payment_methods.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <DateRangeFilter value={range} onChange={setRange} />
        <ListExport
          table={table}
          title={t("Payments Received")}
          filename="payments"
          subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
          columns={[
            { label: "Date", key: "payment_date", type: "date" },
            { label: "Invoice", key: "invoice_number" },
            { label: "Customer", value: (r) => r.customer_name || "Walk-in" },
            { label: "Mode", key: "payment_method" },
            { label: "Reference", key: "reference_no" },
            { label: "Amount", key: "amount", type: "money" },
            { label: "Received by", key: "received_by" },
          ]}
        />
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["reference_no", "received_by", "payment_method"]}
        onRowClick={({ row }) => row.invoice_id && navigate(`/invoices/${row.invoice_id}`)}
      />
    </>
  );
}
