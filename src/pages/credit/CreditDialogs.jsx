import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PaymentsIcon from "@mui/icons-material/Payments";
import { CreditServices } from "../../services/V3Services";
import usePrintJob from "../../components/print/usePrintJob";
import useMeta from "../../hooks/useMeta";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, today } from "../../utils/format";
import { DEFAULT_REMINDER, waReminderLink } from "../../utils/credit";

/** Money received against dues: applied to the oldest bills first. */
export function ReceiveDialog({ row, storeId, onClose, onDone }) {
  const t = useT();
  const notify = useNotify();
  const meta = useMeta();
  const [amount, setAmount] = useState(String(row.due));
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const res = await CreditServices.receive({ customer_id: row.customer_id, store_id: storeId, amount, payment_method: method, reference_no: reference, payment_date: date });
      notify(`${t(res.message)} · ${t("Still due")} ${formatCurrency(res.remaining_due)}`);
      onDone(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {t("Receive payment")} — {row.name}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Pending")} <b>{formatCurrency(row.due)}</b> {t("on")} {row.bills} {t("bill(s)")}. {t("Money is applied to the oldest bills first.")}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              fullWidth
              autoFocus
              type="number"
              label={t("Amount ₹")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField select fullWidth label={t("Mode")} value={method} onChange={(e) => setMethod(e.target.value)}>
              {meta.payment_methods.filter((m) => m !== "Credit").map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth type="date" label={t("Date")} value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          {method !== "Cash" && (
            <Grid size={12}>
              <TextField fullWidth label={t("Reference / UTR")} value={reference} onChange={(e) => setReference(e.target.value)} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" startIcon={<PaymentsIcon />} onClick={save} disabled={saving || !(Number(amount) > 0) || Number(amount) > row.due + 0.009}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function StatementPrint({ s, shop }) {
  return (
    <div className="a4" style={{ padding: 24, fontFamily: "Arial, sans-serif", fontSize: 12, color: "#000", background: "#fff", width: "190mm" }}>
      <h2 style={{ margin: 0 }}>{shop}</h2>
      <h3 style={{ margin: "4px 0 12px" }}>Account statement</h3>
      <div>
        <b>{s.customer.company_name || s.customer.name}</b> {s.customer.phone ? `· ${s.customer.phone}` : ""}
      </div>
      <div style={{ marginBottom: 12 }}>
        {formatDate(s.from)} – {formatDate(s.to)}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Date", "Details", "Bill ₹", "Paid ₹", "Balance ₹"].map((h) => (
              <th key={h} style={{ borderBottom: "1px solid #000", textAlign: h.includes("₹") ? "right" : "left", padding: 4 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 4 }}>{formatDate(s.from)}</td>
            <td style={{ padding: 4 }}>Opening balance</td>
            <td />
            <td />
            <td style={{ padding: 4, textAlign: "right" }}>{s.opening_balance.toFixed(2)}</td>
          </tr>
          {s.entries.map((e, i) => (
            <tr key={i}>
              <td style={{ padding: 4 }}>{formatDate(e.date)}</td>
              <td style={{ padding: 4 }}>{e.type === "bill" ? `Bill ${e.ref}` : `Payment ${e.ref}`}</td>
              <td style={{ padding: 4, textAlign: "right" }}>{e.debit ? e.debit.toFixed(2) : ""}</td>
              <td style={{ padding: 4, textAlign: "right" }}>{e.credit ? e.credit.toFixed(2) : ""}</td>
              <td style={{ padding: 4, textAlign: "right" }}>{e.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ textAlign: "right" }}>Total pending: ₹{s.total_due.toFixed(2)}</h3>
    </div>
  );
}

/** Account statement with running balance + the bills still open. */
export function StatementDialog({ row, storeId, shop, onClose, onReceive }) {
  const t = useT();
  const notify = useNotify();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [range, setRange] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return { from: d.toISOString().slice(0, 10), to: today() };
  });
  const [s, setS] = useState(null);
  const job = usePrintJob();
  const load = useCallback(() => {
    CreditServices.statement({ customer_id: row.customer_id, store_id: storeId, ...range })
      .then((r) => setS(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [row.customer_id, storeId, range, notify]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={phone}>
      <DialogTitle>
        {t("Statement")} — {row.name}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <TextField size="small" type="date" label={t("From")} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label={t("To")} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
        {s && (
          <>
            <Alert severity={s.total_due > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
              {t("Total pending")}: <b>{formatCurrency(s.total_due)}</b>
            </Alert>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("Date")}</TableCell>
                    <TableCell>{t("Details")}</TableCell>
                    <TableCell align="right">{t("Bill")}</TableCell>
                    <TableCell align="right">{t("Paid")}</TableCell>
                    <TableCell align="right">{t("Balance")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{formatDate(s.from)}</TableCell>
                    <TableCell>{t("Opening balance")}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell align="right">{formatCurrency(s.opening_balance)}</TableCell>
                  </TableRow>
                  {s.entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(e.date)}</TableCell>
                      <TableCell>{e.type === "bill" ? `${t("Bill")} ${e.ref}` : `${t("Payment")} ${e.ref}`}</TableCell>
                      <TableCell align="right">{e.debit ? formatCurrency(e.debit) : ""}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>
                        {e.credit ? formatCurrency(e.credit) : ""}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(e.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {s.open_bills.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                  {t("Bills still open")}
                </Typography>
                {s.open_bills.map((b) => (
                  <Box key={b.invoice_id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderTop: 1, borderColor: "divider" }}>
                    <span>
                      {t("Bill")} {b.invoice_number} · {formatDate(b.invoice_date)} ·{" "}
                      <Typography component="span" variant="caption" color={b.days > 30 ? "error.main" : "text.secondary"}>
                        {t("{n} days", { n: b.days })}
                      </Typography>
                    </span>
                    <b>{formatCurrency(b.balance_due)}</b>
                  </Box>
                ))}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>{t("Close")}</Button>
        {row.phone && (
          <Button color="success" startIcon={<WhatsAppIcon />} href={waReminderLink(row, shop)} target="_blank" rel="noopener">
            {t("Remind on WhatsApp")}
          </Button>
        )}
        <Button startIcon={<PrintIcon />} onClick={() => job.print({ pageSize: "A4" })} disabled={!s}>
          {t("Print")}
        </Button>
        {onReceive && (
          <Button variant="contained" startIcon={<PaymentsIcon />} onClick={onReceive} disabled={!s || s.total_due <= 0}>
            {t("Receive payment")}
          </Button>
        )}
      </DialogActions>
      {job.render(() => s && <StatementPrint s={s} shop={shop} />)}
    </Dialog>
  );
}

/** Send payment reminders to many customers at once through WhatsApp API / SMS / Email. */
export function RemindDialog({ rows, storeId, all, onClose }) {
  const t = useT();
  const notify = useNotify();
  const [channels, setChannels] = useState(["whatsapp", "sms", "email"]);
  const [message, setMessage] = useState(DEFAULT_REMINDER);
  const [saving, setSaving] = useState(false);
  const count = useMemo(() => (all ? null : rows.length), [all, rows]);
  const toggle = (c) => setChannels((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));
  const send = async () => {
    setSaving(true);
    try {
      const res = await CreditServices.remind({ store_id: storeId, all, customer_ids: all ? undefined : rows.map((r) => r.customer_id), channels, message });
      notify(t(res.message));
      onClose();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{all ? t("Remind everyone with dues") : t("Send reminder to {n} customer(s)", { n: count })}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("Messages go automatically through the channels set up in Offers & Messages → Channels setup.")}
        </Typography>
        <FormGroup row>
          {[
            ["whatsapp", "WhatsApp (API)"],
            ["sms", "SMS"],
            ["email", "Email"],
          ].map(([k, l]) => (
            <FormControlLabel key={k} control={<Checkbox checked={channels.includes(k)} onChange={() => toggle(k)} />} label={l} />
          ))}
        </FormGroup>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t("Message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          helperText={t("{name} = customer, {due} = amount pending, {bills} = bills, {oldest} = oldest bill date, {shop} = your shop")}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={send} disabled={saving || !channels.length || !message.trim()}>
          {t("Send now")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
