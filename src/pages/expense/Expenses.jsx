import { useEffect, useState } from "react";
import { Box, Button, Chip, IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import ExpenseDialog from "./ExpenseDialog";
import { ExpenseServices } from "../../services/ExpenseServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, datePresets, downloadCsv, formatCurrency, formatDate } from "../../utils/format";

export default function Expenses() {
  const notify = useNotify();
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const [dialog, setDialog] = useState({ open: false, expense: null });
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q, f) => ExpenseServices.getExpenses(p, s, q, f), { filters: { category, ...range }, idField: "expense_id" });
  const summary = table.response?.summary;

  useEffect(() => {
    ExpenseServices.getCategories().then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  const exportCsv = async () => {
    const res = await ExpenseServices.getExpenses(0, 500, table.search, { category, ...range });
    downloadCsv(`expenses_${range.from}_${range.to}.csv`, [
      { label: "Date", key: "expense_date" },
      { label: "Category", key: "category" },
      { label: "Description", key: "description" },
      { label: "Vendor", key: "vendor" },
      { label: "Mode", key: "payment_method" },
      { label: "Reference", key: "reference_no" },
      { label: "GST", key: "tax_amount" },
      { label: "Amount", key: "amount" },
    ], res.data || []);
  };

  const confirmDelete = async () => {
    try {
      await ExpenseServices.deleteExpense(toDelete.expense_id);
      notify("Expense deleted");
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    { field: "expense_date", headerName: "Date", minWidth: 110, valueFormatter: (v) => formatDate(v) },
    { field: "category", headerName: "Category", minWidth: 150, flex: 1 },
    { field: "description", headerName: "Description", minWidth: 180, flex: 1.5 },
    { field: "vendor", headerName: "Paid To", minWidth: 130, flex: 1 },
    { field: "payment_method", headerName: "Mode", minWidth: 100 },
    { field: "amount", headerName: "Amount", minWidth: 120, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
    {
      field: "actions",
      headerName: "",
      minWidth: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <span>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => setDialog({ open: true, expense: row })}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={summary ? `Total ${formatCurrency(summary.total_amount)} in this period` : " "}
        actions={
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
              Export
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, expense: null })}>
              Add Expense
            </Button>
          </>
        }
      />
      {summary?.by_category?.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {summary.by_category.slice(0, 8).map((c) => (
            <Chip key={c.category} label={`${c.category}: ${formatCurrency(c.amount)}`} variant="outlined" onClick={() => setCategory(c.category)} />
          ))}
        </Box>
      )}
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Search expenses" />
        <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <DateRangeFilter value={range} onChange={setRange} />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["description", "vendor", "payment_method"]} />
      <ExpenseDialog
        open={dialog.open}
        expense={dialog.expense}
        categories={categories}
        onClose={() => setDialog({ open: false, expense: null })}
        onSaved={() => {
          notify(dialog.expense ? "Expense updated" : "Expense added");
          setDialog({ open: false, expense: null });
          table.reload();
        }}
      />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete expense?"
        message={toDelete ? `${toDelete.category} · ${formatCurrency(toDelete.amount)}` : ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
