import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckCircle";
import RemoveIcon from "@mui/icons-material/Remove";
import PublicShell from "./PublicShell";
import Loader from "../../components/common/Loader";
import { SaasServices } from "../../services/SaasServices";
import useSaasConfig from "../../hooks/useSaasConfig";
import { useT } from "../../context/PrefsContext";

import { rupees } from "../../components/saas/saasUtils";
const limit = (n, word) => (n ? `${n} ${n === 1 ? word.slice(0, -1) : word}` : `Unlimited ${word}`);

/** Public pricing page: the four plans, monthly / yearly, and what each includes. */
export default function Pricing() {
  const t = useT();
  const cfg = useSaasConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cycle, setCycle] = useState("year");

  useEffect(() => {
    SaasServices.plans()
      .then(setData)
      .catch(() => setError(t("Plans could not be loaded. Please check the internet and refresh.")));
  }, [t]);

  if (cfg && !cfg.saas) {
    return (
      <PublicShell>
        <Alert severity="info">{t("This Khanak is a private installation. Log in with your account.")}</Alert>
      </PublicShell>
    );
  }
  if (error) {
    return (
      <PublicShell>
        <Alert severity="error">{error}</Alert>
      </PublicShell>
    );
  }
  if (!data) return <Loader />;

  const plans = data.data;
  const features = data.features || {};
  const trialDays = cfg?.trial_days ?? 14;
  // "2 users", "1 store", "Unlimited users": the number stays out of the text that is translated
  const limitText = (n, word) => (n ? `${n} ${t(limit(n, word).split(" ")[1])}` : t(limit(n, word)));
  const price = (p) => (cycle === "month" ? p.price_month : p.price_year);

  return (
    <PublicShell>
      <Box sx={{ textAlign: "center", mb: 4, display: "grid", gap: 1.5, justifyItems: "center" }}>
        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 30, md: 44 }, textWrap: "balance" }}>
          {t("Billing that sounds like business")}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
          {t("GST bills, KOT, stock, udhaar and WhatsApp offers for ice cream parlours, cafes, sweet shops and every counter. Works on phone, tablet and computer — even without internet.")}
        </Typography>
        {trialDays > 0 && <Chip color="secondary" label={t("{n}-day free trial · no card needed", { n: trialDays })} sx={{ fontWeight: 700 }} />}
        <ToggleButtonGroup exclusive size="small" value={cycle} onChange={(_, v) => v && setCycle(v)} sx={{ mt: 1 }}>
          <ToggleButton value="year">{t("Yearly (save ~17%)")}</ToggleButton>
          <ToggleButton value="month">{t("Monthly")}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={2} data-tour="pricing-plans">
        {plans.map((p) => {
          const popular = p.code === "growth";
          const amount = price(p);
          return (
            <Grid key={p.code} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card variant="outlined" sx={{ height: "100%", borderWidth: popular ? 2 : 1, borderColor: popular ? "secondary.main" : "divider", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ display: "grid", gap: 1.5, flex: 1, alignContent: "start" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {p.name}
                    </Typography>
                    {popular && <Chip size="small" color="secondary" label={t("Most popular")} />}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t(p.tagline)}
                  </Typography>
                  <Box>
                    {amount ? (
                      <>
                        <Typography component="span" variant="h4" sx={{ fontWeight: 800 }}>
                          {rupees(amount)}
                        </Typography>
                        <Typography component="span" color="text.secondary">
                          {" "}/ {cycle === "month" ? t("month") : t("year")}
                          {p.per_store ? ` / ${t("store")}` : ""}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="h6" color="text.secondary">
                        {t("Yearly only")}
                      </Typography>
                    )}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t("+ {gst}% GST", { gst: data.gst_rate })}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    <b>{limitText(p.max_users, "users")}</b> · <b>{limitText(p.max_stores, "stores")}</b>
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 0, listStyle: "none", display: "grid", gap: 0.75 }}>
                    {p.features.map((f) => (
                      <Box component="li" key={f} sx={{ display: "flex", gap: 1, alignItems: "flex-start", fontSize: 14 }}>
                        <CheckIcon color="success" sx={{ fontSize: 18, mt: "2px" }} />
                        <span>{t(features[f] || f)}</span>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
                <Box sx={{ p: 2, pt: 0, display: "grid", gap: 1 }}>
                  {amount > 0 && (
                    <Button component={RouterLink} to={`/signup?plan=${p.code}&cycle=${cycle}`} variant={popular ? "contained" : "outlined"} color={popular ? "secondary" : "primary"}>
                      {t("Buy {plan}", { plan: p.name })}
                    </Button>
                  )}
                  {trialDays > 0 && !p.per_store && (
                    <Button component={RouterLink} to={`/signup?plan=${p.code}&trial=1`} size="small">
                      {t("Start free trial")}
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h5" sx={{ fontWeight: 800, mt: 6, mb: 2 }}>
        {t("Compare plans")}
      </Typography>
      <TableContainer component={Card} variant="outlined">
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("Feature")}</TableCell>
              {plans.map((p) => (
                <TableCell key={p.code} align="center" sx={{ fontWeight: 700 }}>
                  {p.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(features).map(([k, label]) => (
              <TableRow key={k}>
                <TableCell>{t(label)}</TableCell>
                {plans.map((p) => (
                  <TableCell key={p.code} align="center">
                    {p.features.includes(k) ? <CheckIcon color="success" fontSize="small" /> : <RemoveIcon color="disabled" fontSize="small" />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell>{t("Users")}</TableCell>
              {plans.map((p) => (
                <TableCell key={p.code} align="center">
                  {p.max_users || "∞"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>{t("Stores")}</TableCell>
              {plans.map((p) => (
                <TableCell key={p.code} align="center">
                  {p.max_stores || "∞"}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Grid container spacing={2} sx={{ mt: 4 }}>
        {[
          ["How do I get my login?", "Right after payment (or when you start the free trial) the screen shows your shop code, email and password, and the same details are emailed to you."],
          ["What happens when the plan ends?", "You get reminders before the end. After the end there are a few grace days; then the app becomes read-only until you renew. Your data is never deleted."],
          ["Can I change the plan later?", "Yes. Upgrade any time from Settings > Plan & billing; the new features open at once."],
          ["Is my data safe?", "Every shop has its own database. Nightly backups, and your own Google Drive backup if you connect it."],
        ].map(([q, a]) => (
          <Grid key={q} size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontWeight: 700 }}>{t(q)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t(a)}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </PublicShell>
  );
}
