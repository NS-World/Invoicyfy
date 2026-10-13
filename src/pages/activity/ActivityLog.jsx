import { useMemo, useState } from "react";
import { Box, Chip, Dialog, DialogContent, DialogTitle, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import StorePicker from "../../components/v3/StorePicker";
import useServerTable from "../../hooks/useServerTable";
import useStoreId from "../../hooks/useStoreId";
import { ActivityServices } from "../../services/V3Services";
import { useT } from "../../context/PrefsContext";
import { formatDate, formatTime } from "../../utils/format";

const GROUPS = [
  ["", "Everything"],
  ["invoice", "Bills"],
  ["payment", "Payments"],
  ["discount", "Discount approvals"],
  ["order", "Orders"],
  ["product", "Products & prices"],
  ["stock", "Stock"],
  ["cash", "Day close / cash"],
  ["coupon", "Coupons"],
  ["loyalty", "Loyalty points"],
  ["credit", "Udhaar"],
  ["user", "Users"],
  ["role", "Roles"],
  ["login", "Logins"],
  ["settings", "Settings"],
];

const COLOR = (a) =>
  /cancel|delete|failed|pay_out|damage|deactivate/.test(a) ? "error" : /approved|price|adjust|hold_delete|update|status/.test(a) ? "warning" : /create|open|add|payment|login$/.test(a) ? "success" : "default";

/** Who did what and when: bills, cancellations, discounts, price changes, day close, logins... */
export default function ActivityLog() {
  const t = useT();
  const [storeId, setStoreId] = useStoreId();
  const [range, setRange] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
  });
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [important, setImportant] = useState(false);
  const [detail, setDetail] = useState(null);
  const table = useServerTable((p, s, q, f) => ActivityServices.list(p, s, q, f), {
    idField: "log_id",
    pageSize: 50,
    filters: { store_id: storeId, action, user_id: userId, important: important ? 1 : "", ...range },
  });
  const users = table.response?.users || [];

  const columns = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "When",
        width: 150,
        valueFormatter: (v) => `${formatDate(v, "short")} ${formatTime(v)}`,
      },
      { field: "user_name", headerName: "Who", width: 140, valueFormatter: (v) => v || "—" },
      {
        field: "action",
        headerName: "What",
        width: 170,
        renderCell: (p) => <Chip size="small" variant="outlined" color={COLOR(p.value)} label={p.value} />,
      },
      { field: "summary", headerName: "Details", flex: 1, minWidth: 260 },
      { field: "ip", headerName: "IP", width: 130 },
    ],
    []
  );

  return (
    <Box>
      <PageHeader title={t("Activity Log")} subtitle={t("Every important action with who did it and when")} actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder={t("Search bill no., name, amount")} />
        <DateRangeFilter value={range} onChange={setRange} />
        <TextField select size="small" label={t("Type")} value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 170 }}>
          {GROUPS.map(([k, l]) => (
            <MenuItem key={k || "all"} value={k}>
              {t(l)}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label={t("User")} value={userId} onChange={(e) => setUserId(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">{t("Everyone")}</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.user_id} value={u.user_id}>
              {u.user_name}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel data-tour="activity-important" control={<Switch checked={important} onChange={(e) => setImportant(e.target.checked)} />} label={t("Only important (cancel, delete, discounts...)")} />
      </Toolbar>
      <DataTable table={table} columns={columns} onRowClick={(p) => setDetail(p.row)} mobileHidden={["ip", "action"]} getRowHeight={() => "auto"} />
      {detail && (
        <Dialog open onClose={() => setDetail(null)} fullWidth maxWidth="sm">
          <DialogTitle>{detail.action}</DialogTitle>
          <DialogContent dividers>
            <Typography sx={{ fontWeight: 600 }}>{detail.summary}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDate(detail.created_at)} {formatTime(detail.created_at)} · {detail.user_name || "—"} · {detail.ip || ""}
            </Typography>
            {detail.details && (
              <Box component="pre" sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(detail.details, null, 2)}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
