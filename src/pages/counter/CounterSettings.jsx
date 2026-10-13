import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Divider, FormControlLabel, Grid, Paper, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
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
      const res = await PosServices.save({ store_id: storeId, require_day_open: s.require_day_open, table_count: s.table_count, upi_qr_on_screen: s.upi_qr_on_screen });
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
