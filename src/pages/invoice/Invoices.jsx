import { useState } from "react";
import { Box, Button, Grid, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PrintIcon from "@mui/icons-material/Print";
import PaymentsIcon from "@mui/icons-material/Payments";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import StatCard from "../../components/common/StatCard";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import PaymentDialog from "../../components/billing/PaymentDialog";
import { InvoiceServices } from "../../services/InvoiceServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { datePresets, formatCurrency, formatDate } from "../../utils/format";

export default function Invoices() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const [payFor, setPayFor] = useState(null);
  const table = useServerTable((p, s, q, f) => InvoiceServices.getInvoices(p, s, q, f), {
    filters: { status, invoice_type: type, ...range },
    idField: "invoice_id",
  });
  const summary = table.response?.summary;

  const columns = [
    { field: "invoice_number", headerName: "Invoice No", minWidth: 140, flex: 1 },
    { field: "invoice_date", headerName: "Date", minWidth: 110, valueFormatter: (v) => formatDate(v) },
    {
      field: "customer_name",
      headerName: "Customer",
      minWidth: 170,
      flex: 1.4,
      renderCell: ({ row }) => (
        <Box sx={{ lineHeight: 1.2, py: 0.5 }}>
          <div>{row.customer_name || "Walk-in"}</div>
          {(row.customer_gstin || row.customer_phone) && (
            <Typography variant="caption" color="text.secondary">
              {row.customer_gstin || row.customer_phone}
            </Typography>
          )}
        </Box>
      ),
    },
    { field: "invoice_type", headerName: "Type", minWidth: 90, renderCell: ({ value }) => <StatusChip status={value} label={value === "tax" ? "GST" : "Retail"} /> },
    { field: "total_amount", headerName: "Amount", minWidth: 120, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
    { field: "balance_due", headerName: "Due", minWidth: 110, type: "number", valueFormatter: (v) => (v > 0 ? formatCurrency(v) : "—") },
    {
      field: "status",
      headerName: "Status",
      minWidth: 110,
      renderCell: ({ row }) => <StatusChip status={row.is_overdue ? "Overdue" : row.status} />,
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 96,
      sortable: false,
      renderCell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Print">
            <IconButton size="small" onClick={() => navigate(`/invoices/${row.invoice_id}?print=${row.invoice_type === "retail" ? "receipt" : "a4"}`)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.balance_due > 0 && row.status !== "Cancelled" && can("payments", "add") && (
            <Tooltip title="Record payment">
              <IconButton size="small" color="success" onClick={() => setPayFor(row)}>
                <PaymentsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          can("invoices", "add") && (
          <>
            <Button variant="outlined" onClick={() => navigate("/invoices/new?type=tax")}>
              New GST Invoice
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/invoices/new")}>
              Quick Bill
            </Button>
          </>
          )
        }
      />
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Billed" value={formatCurrency(summary?.total_amount)} loading={!summary} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Received" value={formatCurrency(summary?.amount_paid)} color="success.main" loading={!summary} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Outstanding" value={formatCurrency(summary?.balance_due)} color="warning.main" loading={!summary} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="GST collected" value={formatCurrency(summary?.tax_amount)} color="secondary.main" loading={!summary} />
        </Grid>
      </Grid>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Invoice no, customer, GSTIN" />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Due">Unpaid + Partial</MenuItem>
          <MenuItem value="Overdue">Overdue</MenuItem>
          <MenuItem value="Paid">Paid</MenuItem>
          <MenuItem value="Unpaid">Unpaid</MenuItem>
          <MenuItem value="Partial">Partial</MenuItem>
          <MenuItem value="Cancelled">Cancelled</MenuItem>
        </TextField>
        <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="retail">Retail bill</MenuItem>
          <MenuItem value="tax">GST invoice</MenuItem>
        </TextField>
        <DateRangeFilter value={range} onChange={setRange} />
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["invoice_date", "invoice_type", "balance_due"]}
        onRowClick={({ row }) => navigate(`/invoices/${row.invoice_id}`)}
        getRowHeight={() => "auto"}
      />
      <PaymentDialog
        invoice={payFor}
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        onSaved={() => {
          setPayFor(null);
          notify("Payment recorded");
          table.reload();
        }}
      />
    </>
  );
}
