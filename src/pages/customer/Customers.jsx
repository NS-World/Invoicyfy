import { useState } from "react";
import { Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import ListExport from "../../components/common/ListExport";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import DeleteRelatedDialog from "../../components/common/DeleteRelatedDialog";
import { CustomerServices } from "../../services/CustomerServices";
import { useNotify } from "../../context/NotifyProvider";
import useServerTable from "../../hooks/useServerTable";
import { formatCurrency } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

export default function Customers() {
  const t = useT();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [type, setType] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const table = useServerTable((p, s, q, f) => CustomerServices.getCustomersData(p, s, q, f), { filters: { customer_type: type }, idField: "customer_id" });


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
          {can("invoices", "add") && (
          <Tooltip title={t("New invoice")}>
            <IconButton size="small" color="success" onClick={() => navigate(`/invoices/new${row.customer_type === "B2B" ? "?type=tax" : ""}`)}>
              <ReceiptIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
          {can("customers", "edit") && (
          <Tooltip title={t("Edit")}>
            <IconButton size="small" color="primary" onClick={() => navigate(`/customer?id=${row.customer_id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          )}
          {can("customers", "delete") && (
          <Tooltip title={t("Delete")}>
            <IconButton size="small" color="error" onClick={() => setToDelete(row)}>
              <DeleteIcon fontSize="small" />
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
        title={t("Customers")}
        actions={
          can("customers", "add") && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/customer")}>
              {t("Add Customer")}
            </Button>
          )
        }
      />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Name, mobile, email, GSTIN")} />
        <TextField select label={t("Type")} value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t("All")}</MenuItem>
          <MenuItem value="B2C">{t("B2C (consumer)")}</MenuItem>
          <MenuItem value="B2B">{t("B2B (business)")}</MenuItem>
        </TextField>
        <ListExport
          table={table}
          title={t("Customers")}
          filename="customers"
          columns={[
            { label: "Name", key: "name" },
            { label: "Company", key: "company_name" },
            { label: "Type", key: "customer_type" },
            { label: "Mobile", key: "phone" },
            { label: "Email", key: "email" },
            { label: "GSTIN", key: "gstin" },
            { label: "Address", key: "address" },
            { label: "City", key: "city" },
            { label: "State", key: "state" },
            { label: "PIN", key: "pincode" },
            { label: "Offers on WhatsApp", value: (r) => (Number(r.marketing_opt_in) ? "Yes" : "No") },
            { label: "Outstanding", key: "outstanding", type: "money" },
          ]}
        />
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        mobileHidden={["customer_type", "gstin", "city"]}
        getRowHeight={() => "auto"}
        onRowClick={({ row }) => navigate(`/customer?id=${row.customer_id}`)}
      />
      <DeleteRelatedDialog
        open={Boolean(toDelete)}
        title="Delete customer?"
        name={toDelete?.company_name || toDelete?.name}
        preview={() => CustomerServices.deleteCustomerDataFromId({ customer_id: toDelete.customer_id, preview: true })}
        remove={() => CustomerServices.deleteCustomerDataFromId({ customer_id: toDelete.customer_id })}
        onClose={() => setToDelete(null)}
        onDeleted={(res) => {
          notify(res.message);
          setToDelete(null);
          table.reload();
        }}
      />
    </>
  );
}
