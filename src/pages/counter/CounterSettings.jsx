import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Grid, IconButton, InputAdornment, Paper, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StorePicker from "../../components/v3/StorePicker";
import PrinterSetup from "../../components/printer/PrinterSetup";
import useStoreId from "../../hooks/useStoreId";
import { PinServices, PosServices } from "../../services/V3Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError } from "../../utils/format";

function MyPin() {
  const t = useT();
  const notify = useNotify();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (remove = false) => {
    setSaving(true);
    try {
      const res = await PinServices.setMine({ current_password: password, pin, remove });
      notify(t(res.message));
      setPassword("");
      setPin("");
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {t("My approval PIN")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("Managers type this PIN on the cashier's screen to approve a discount above the cashier's limit. Limits are set per role in Roles & Permissions.")}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth type="password" label={t("Your login password")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            type="password"
            label={t("New PIN (4-8 digits)")}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "new-password" } }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={() => save(false)} disabled={saving || !password || pin.length < 4}>
          {t("Save PIN")}
        </Button>
        <Button color="error" onClick={() => save(true)} disabled={saving || !password}>
          {t("Remove my PIN")}
        </Button>
      </Box>
    </Paper>
  );
}

/** Counter settings (tables, day-open rule, UPI QR), the manager approval PIN and the printer. */
export default function CounterSettings() {
  const t = useT();
  const notify = useNotify();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [tab, setTab] = useState(() => (window.location.hash === "#printer" ? "printer" : window.location.hash === "#pin" ? "pin" : "counter"));
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const canEdit = can("settings", "edit");

  const load = useCallback(() => {
    if (!storeId) return;
    PosServices.get(storeId)
      .then((r) => setS(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [storeId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await PosServices.save({
        store_id: storeId,
        require_day_open: s.require_day_open,
        table_count: s.table_count,
        upi_qr_on_screen: s.upi_qr_on_screen,
        // V4
        auto_send_bill: s.auto_send_bill,
        bill_channels: s.bill_channels,
        bill_message: s.bill_message,
        online_platforms: (s.online_platforms || []).filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), commission: Number(p.commission) || 0 })),
        expiry_alert_days: s.expiry_alert_days,
      });
      notify(t(res.message));
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Box>
      <PageHeader title={t("Counter & Printer")} subtitle={t("How the billing counter works, approval PIN and direct printing")} actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile data-tour="counter-tabs">
        <Tab value="counter" label={t("Counter")} />
        <Tab value="printer" label={t("Printer")} data-tour="printer-tab" />
        <Tab value="pin" label={t("My approval PIN")} />
      </Tabs>
      {tab === "counter" &&
        (!s ? (
          <Loader />
        ) : (
          <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760 }}>
            <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <TextField
                type="number"
                label={t("Number of tables")}
                value={s.table_count}
                onChange={(e) => setS({ ...s, table_count: e.target.value })}
                helperText={t("0 = no tables. With tables, Quick Bill and Orders show table buttons and the table prints on the bill and KOT.")}
                slotProps={{ htmlInput: { min: 0, max: 200, inputMode: "numeric" } }}
                sx={{ maxWidth: 420 }}
                fullWidth
              />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch checked={Boolean(s.require_day_open)} onChange={(e) => setS({ ...s, require_day_open: e.target.checked })} />}
                label={t("Billing only after the day is opened (Day Close)")}
              />
              <Typography variant="caption" color="text.secondary" component="div" sx={{ ml: 6 }}>
                {t("Makes sure every rupee is counted in the day's cash.")}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch checked={Boolean(s.upi_qr_on_screen)} onChange={(e) => setS({ ...s, upi_qr_on_screen: e.target.checked })} />}
                label={t("Show UPI QR with the bill amount on screen")}
              />
              {!s.upi_id && (
                <Alert severity="info" sx={{ mt: 1 }} action={<Button onClick={() => navigate("/settings")}>{t("Settings")}</Button>}>
                  {t("Add your UPI ID in Business Settings to show the QR.")}
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch checked={Boolean(s.auto_send_bill)} onChange={(e) => setS({ ...s, auto_send_bill: e.target.checked })} />}
                label={t("Send the bill to the customer automatically when it is saved")}
              />
              <Typography variant="caption" color="text.secondary" component="div" sx={{ ml: 6, mb: 1 }}>
                {t("The customer gets a link to the bill (opens on the phone, can be saved as PDF). Needs the customer's mobile / email on the bill and WhatsApp API, SMS or Email set up in Offers & Messages.")}
              </Typography>
              {s.auto_send_bill && (
                <Box sx={{ ml: { sm: 6 } }}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {[
                      ["whatsapp", "WhatsApp"],
                      ["sms", "SMS"],
                      ["email", "Email"],
                    ].map(([k, label]) => (
                      <FormControlLabel
                        key={k}
                        control={
                          <Checkbox
                            checked={(s.bill_channels || []).includes(k)}
                            onChange={(e) => setS({ ...s, bill_channels: e.target.checked ? [...(s.bill_channels || []), k] : (s.bill_channels || []).filter((c) => c !== k) })}
                          />
                        }
                        label={label}
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label={t("Message")}
                    value={s.bill_message || ""}
                    onChange={(e) => setS({ ...s, bill_message: e.target.value })}
                    helperText={t("You can use {name} {shop} {bill_no} {amount} {date} {link}")}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 700 }}>{t("Online platforms (Swiggy, Zomato...)")}</Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                {t("In Quick Bill choose the platform and its order number. Commission % is used to estimate the payout in Online orders.")}
              </Typography>
              {(s.online_platforms || []).map((p, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, mb: 1, maxWidth: 480 }}>
                  <TextField size="small" label={t("Platform")} value={p.name} onChange={(e) => setS({ ...s, online_platforms: s.online_platforms.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)) })} sx={{ flex: 1 }} />
                  <TextField
                    size="small"
                    type="number"
                    label={t("Commission")}
                    value={p.commission}
                    onChange={(e) => setS({ ...s, online_platforms: s.online_platforms.map((x, n) => (n === i ? { ...x, commission: e.target.value } : x)) })}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                    sx={{ width: 140 }}
                  />
                  <IconButton aria-label={t("Remove")} color="error" onClick={() => setS({ ...s, online_platforms: s.online_platforms.filter((_, n) => n !== i) })}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {(s.online_platforms || []).length < 8 && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setS({ ...s, online_platforms: [...(s.online_platforms || []), { name: "", commission: 0 }] })}>
                  {t("Add platform")}
                </Button>
              )}

              <Divider sx={{ my: 2 }} />
              <TextField
                type="number"
                label={t("Expiry alert (days before)")}
                value={s.expiry_alert_days ?? 3}
                onChange={(e) => setS({ ...s, expiry_alert_days: e.target.value })}
                helperText={t("Batches expiring within these days show on the owner dashboard and in the daily low-stock alert.")}
                slotProps={{ htmlInput: { min: 0, max: 60, inputMode: "numeric" } }}
                sx={{ maxWidth: 420 }}
                fullWidth
              />
            </fieldset>
            {canEdit && (
              <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
                {t("Save")}
              </Button>
            )}
          </Paper>
        ))}
      {tab === "printer" && <PrinterSetup />}
      {tab === "pin" && <MyPin />}
    </Box>
  );
}
