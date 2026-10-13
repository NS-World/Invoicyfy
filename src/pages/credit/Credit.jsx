import { useMemo, useState } from "react";
import { Box, Button, Chip, Grid, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PeopleIcon from "@mui/icons-material/People";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/common/StatCard";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useServerTable from "../../hooks/useServerTable";
import useStores from "../../hooks/useStores";
import { CreditServices } from "../../services/V3Services";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { waReminderLink } from "../../utils/credit";
import { ReceiveDialog, RemindDialog, StatementDialog } from "./CreditDialogs";

const daysSince = (d) => (d ? Math.max(0, Math.round((Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86400000)) : 0);

/** Udhaar / credit: who owes how much and since when, receive money, statements and reminders. */
export default function Credit() {
  const t = useT();
  const { can } = useAuth();
  const { stores } = useStores();
  const [storeId, setStoreId] = useStoreId();
  const [minDays, setMinDays] = useState(0);
  const [statement, setStatement] = useState(null);
  const [receive, setReceive] = useState(null);
  const [remind, setRemind] = useState(null);
  const shop = stores.find((s) => String(s.store_id) === String(storeId))?.name;
  const table = useServerTable((p, s, q, f) => CreditServices.dues(p, s, q, f), { idField: "customer_id", pageSize: 25, filters: { store_id: storeId, min_days: minDays } });
  const sum = table.response?.summary;

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Customer",
        flex: 1.2,
        minWidth: 150,
        renderCell: (p) => (
          <Box sx={{ lineHeight: 1.2, py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {p.row.company_name || p.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {p.row.phone}
            </Typography>
          </Box>
        ),
      },
      {
        field: "due",
        headerName: "Pending",
        width: 120,
        type: "number",
        renderCell: (p) => <Typography sx={{ fontWeight: 800, color: "error.main" }}>{formatCurrency(p.value)}</Typography>,
      },
      { field: "bills", headerName: "Bills", width: 70, type: "number" },
      {
        field: "oldest",
        headerName: "Oldest",
        width: 120,
        renderCell: (p) => {
          const d = daysSince(p.value);
          return <Chip size="small" color={d > 60 ? "error" : d > 30 ? "warning" : "default"} label={t("{n} days", { n: d })} />;
        },
      },
      {
        field: "aging",
        headerName: "0-30 / 31-60 / 61-90 / 90+",
        width: 230,
        sortable: false,
        valueGetter: (v, r) => [r.d0_30, r.d31_60, r.d61_90, r.d90].map((x) => (x ? formatCurrency(x, { symbol: false }) : "–")).join(" / "),
      },
      { field: "last_payment", headerName: "Last paid", width: 120, valueFormatter: (v) => (v ? formatDate(v) : "—") },
      { field: "last_reminder_at", headerName: "Reminded", width: 120, valueFormatter: (v) => (v ? formatDate(v) : "—") },
      {
        field: "actions",
        headerName: "",
        width: 150,
        sortable: false,
        renderCell: (p) => (
          <Box onClick={(e) => e.stopPropagation()}>
            <Tooltip title={t("Statement")}>
              <IconButton size="small" onClick={() => setStatement(p.row)}>
                <ReceiptLongIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {can("payments", "add") && (
              <Tooltip title={t("Receive payment")}>
                <IconButton size="small" color="primary" onClick={() => setReceive(p.row)}>
                  <PaymentsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {p.row.phone && (
              <Tooltip title={t("Remind on WhatsApp")}>
                <IconButton size="small" color="success" href={waReminderLink(p.row, shop)} target="_blank" rel="noopener">
                  <WhatsAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {can("payments", "add") && (
              <Tooltip title={t("Send automatic reminder")}>
                <IconButton size="small" onClick={() => setRemind({ rows: [p.row] })}>
                  <NotificationsActiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [t, can, shop]
  );

  return (
    <Box>
      <PageHeader
        title={t("Udhaar / Credit")}
        subtitle={t("Customers who still have to pay, since when, and reminders")}
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("payments", "add") && (
              <Button variant="contained" startIcon={<NotificationsActiveIcon />} onClick={() => setRemind({ all: true, rows: [] })} disabled={!table.total}>
                {t("Remind all")}
              </Button>
            )}
          </>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }} data-tour="credit-stats">
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Total pending" value={formatCurrency(sum?.total || 0)} icon={<AccountBalanceWalletIcon />} color="error.main" loading={!sum} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Customers" value={sum?.customers ?? 0} icon={<PeopleIcon />} loading={!sum} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Older than 30 days" value={formatCurrency(sum?.over_30_days || 0)} icon={<WarningAmberIcon />} color="warning.main" loading={!sum} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Walk-in (no customer)" value={formatCurrency(sum?.walk_in || 0)} icon={<PersonOffIcon />} color="text.secondary" loading={!sum} />
        </Grid>
      </Grid>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search name or mobile")} />
        <TextField select size="small" label={t("Pending since")} value={minDays} onChange={(e) => setMinDays(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value={0}>{t("Any time")}</MenuItem>
          <MenuItem value={30}>{t("More than 30 days")}</MenuItem>
          <MenuItem value={60}>{t("More than 60 days")}</MenuItem>
          <MenuItem value={90}>{t("More than 90 days")}</MenuItem>
        </TextField>
      </Toolbar>
      <DataTable
        table={table}
        columns={columns}
        onRowClick={(p) => setStatement(p.row)}
        mobileHidden={["bills", "aging", "last_payment", "last_reminder_at"]}
        getRowHeight={() => "auto"}
      />
      {statement && (
        <StatementDialog
          row={statement}
          storeId={storeId}
          shop={shop}
          onClose={() => setStatement(null)}
          onReceive={can("payments", "add") ? () => setReceive(statement) : undefined}
        />
      )}
      {receive && (
        <ReceiveDialog
          row={receive}
          storeId={storeId}
          onClose={() => setReceive(null)}
          onDone={() => {
            setReceive(null);
            setStatement(null);
            table.reload();
          }}
        />
      )}
      {remind && (
        <RemindDialog
          rows={remind.rows}
          all={Boolean(remind.all)}
          storeId={storeId}
          onClose={() => {
            setRemind(null);
            table.reload();
          }}
        />
      )}
    </Box>
  );
}
