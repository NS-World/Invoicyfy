import { useState } from "react";
import { Button, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import GenerateInvoiceDialog from "../../components/billing/GenerateInvoiceDialog";
import { OrderServices } from "../../services/OrderServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { apiError, formatCurrency, formatDate } from "../../utils/format";

const STATUSES = ["Pending", "Approved", "Invoiced", "Cancelled"];

export default function Orders() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [toInvoice, setToInvoice] = useState(null);
  const table = useServerTable((p, s, q, f) => OrderServices.getOrdersData(p, s, q, f), { filters: { status }, idField: "order_id" });

  const confirmDelete = async () => {
    try {
      await OrderServices.deleteOrderDataFromId({ order_id: toDelete.order_id });
      notify("Order deleted");
      table.reload();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setToDelete(null);
  };

  const columns = [
    { field: "order_number", headerName: "Order No", minWidth: 140, flex: 1 },
    { field: "order_date", headerName: "Date", minWidth: 110, valueFormatter: (v) => formatDate(v) },
    {
      field: "customer_name",
      headerName: "Customer",
      minWidth: 160,
      flex: 1.3,
      renderCell: ({ row }) => (
        <span>
          {row.customer_name}
          {row.customer_phone && (
            <Typography component="span" variant="caption" color="text.secondary">
              {" "}· {row.customer_phone}
            </Typography>
          )}
        </span>
      ),
    },
    { field: "order_type", headerName: "Type", minWidth: 100 },
    { field: "item_count", headerName: "Items", minWidth: 70, type: "number" },
    { field: "total_amount", headerName: "Total", minWidth: 120, type: "number", renderCell: ({ value }) => <strong>{formatCurrency(value)}</strong> },
    { field: "status", headerName: "Status", minWidth: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: "user_name", headerName: "Created By", minWidth: 120 },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 170,
      sortable: false,
      renderCell: ({ row }) => {
        const open = ["Pending", "Approved"].includes(row.status);
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View">
              <IconButton size="small" onClick={() => navigate(`/orders/${row.order_id}`)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {open && can("orders", "edit") && (
              <Tooltip title="Edit">
                <IconButton size="small" color="primary" onClick={() => navigate(`/order?id=${row.order_id}`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {open && can("invoices", "add") && (
              <Tooltip title="Generate invoice">
                <IconButton size="small" color="success" onClick={() => setToInvoice(row)}>
                  <ReceiptIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.invoice_id && (
              <Tooltip title="Open invoice">
                <IconButton size="small" color="success" onClick={() => navigate(`/invoices/${row.invoice_id}`)}>
                  <ReceiptIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!row.invoice_id && can("orders", "delete") && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          can("orders", "add") && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/order")}>
              New Order
            </Button>
          )
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Order no, customer, mobile" />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["order_date", "order_type", "item_count", "user_name"]}
        onRowClick={({ row }) => navigate(`/orders/${row.order_id}`)}
      />
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete order?"
        message={`Order ${toDelete?.order_number || ""} will be permanently deleted.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
      <GenerateInvoiceDialog order={toInvoice} open={Boolean(toInvoice)} onClose={() => setToInvoice(null)} />
    </>
  );
}
