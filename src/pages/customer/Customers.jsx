import { useState } from "react";
import { Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { CustomerServices } from "../../services/CustomerServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatCurrency } from "../../utils/format";

export default function Customers() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [type, setType] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q, f) => CustomerServices.getCustomersData(p, s, q, f), { filters: { customer_type: type }, idField: "customer_id" });

  const confirmDelete = async () => {
    try {
      await CustomerServices.deleteCustomerDataFromId({ customer_id: toDelete.customer_id });
      notify("Customer deleted");
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 180,
      flex: 1.4,
      renderCell: ({ row }) => (
        <Box sx={{ lineHeight: 1.2, py: 0.5 }}>
          <div>{row.company_name || row.name}</div>
          {row.company_name && (
            <Typography variant="caption" color="text.secondary">
              {row.name}
            </Typography>
          )}
        </Box>
      ),
    },
    { field: "customer_type", headerName: "Type", minWidth: 80, renderCell: ({ value }) => <StatusChip status={value === "B2B" ? "tax" : "retail"} label={value} /> },
    { field: "phone", headerName: "Mobile", minWidth: 120 },
    { field: "gstin", headerName: "GSTIN", minWidth: 160 },
    { field: "city", headerName: "City", minWidth: 110 },
    {
      field: "outstanding",
      headerName: "Outstanding",
      minWidth: 120,
      type: "number",
      renderCell: ({ value }) => (value > 0 ? <Typography variant="body2" color="warning.dark" sx={{ fontWeight: 700, lineHeight: "inherit" }}>{formatCurrency(value)}</Typography> : "—"),
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip title="New invoice">
            <IconButton size="small" color="success" onClick={() => navigate(`/invoices/new${row.customer_type === "B2B" ? "?type=tax" : ""}`)}>
              <ReceiptIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => navigate(`/customer?id=${row.customer_id}`)}>
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
        title="Customers"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/customer")}>
            Add Customer
          </Button>
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Name, mobile, email, GSTIN" />
        <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="B2C">B2C (consumer)</MenuItem>
          <MenuItem value="B2B">B2B (business)</MenuItem>
        </TextField>
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["customer_type", "gstin", "city"]}
        getRowHeight={() => "auto"}
        onRowClick={({ row }) => navigate(`/customer?id=${row.customer_id}`)}
      />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete customer?"
        message={`${toDelete?.name || ""} will be deleted.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
