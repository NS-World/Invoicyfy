import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PublicShell from "./PublicShell";
import { WELCOME_KEY } from "../../components/saas/saasUtils";
import { shopStore } from "../../services/axios";
import { useT } from "../../context/PrefsContext";
import { formatDate } from "../../utils/format";

/** After sign-up: the shop code, email and password (shown once; also emailed). */
export default function Welcome() {
  const t = useT();
  const { state } = useLocation();
  const creds = useMemo(() => {
    if (state?.credentials) return state.credentials;
    try {
      return JSON.parse(sessionStorage.getItem(WELCOME_KEY) || "null");
    } catch {
      return null;
    }
  }, [state]);
  const [copied, setCopied] = useState("");

  if (!creds) {
    return (
      <PublicShell maxWidth="sm">
        <Alert severity="info">
          {t("Your login details were shown once and emailed to you. Open the email, or log in if you saved them.")}
        </Alert>
        <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 2 }}>
          {t("Go to login")}
        </Button>
      </PublicShell>
    );
  }

  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* the text stays selectable */
    }
  };
  const all = `Khanak login\nShop code: ${creds.shop_code}\nEmail: ${creds.email}\nPassword: ${creds.password}`;
  const rows = [
    ["shop", t("Shop code"), creds.shop_code],
    ["email", t("Email"), creds.email],
    ["password", t("Password"), creds.password],
  ];

  return (
    <PublicShell maxWidth="sm">
      <Box sx={{ display: "grid", gap: 2 }} data-tour="welcome-credentials">
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {t("Your shop is ready!")}
        </Typography>
        <Typography color="text.secondary">
          {creds.business_name} · {creds.plan} {creds.status === "trial" ? t("(free trial)") : ""} · {t("valid till {d}", { d: formatDate(creds.valid_till) })}
        </Typography>
        <Card variant="outlined" sx={{ borderColor: "secondary.main", borderWidth: 2 }}>
          <CardContent sx={{ display: "grid", gap: 1.5 }}>
            {rows.map(([key, label, value]) => (
              <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "space-between", flexWrap: "wrap" }}>
                <Typography color="text.secondary" sx={{ minWidth: 90 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, flex: 1, wordBreak: "break-all", userSelect: "all" }}>{value}</Typography>
                <Tooltip title={copied === key ? t("Copied") : t("Copy")}>
                  <IconButton size="small" onClick={() => copy(key, value)} aria-label={t("Copy")}>
                    {copied === key ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            <Button variant="outlined" onClick={() => copy("all", all)} startIcon={copied === "all" ? <CheckIcon /> : <ContentCopyIcon />}>
              {t("Copy all details")}
            </Button>
          </CardContent>
        </Card>
        <Alert severity="warning">
          {t("Save these details now. The password is shown only once here; the same details are also emailed to {email}. Change the password after the first login.", { email: creds.email })}
        </Alert>
        <Button
          component={RouterLink}
          to={`/login?shop=${encodeURIComponent(creds.shop_code)}&email=${encodeURIComponent(creds.email)}`}
          onClick={() => {
            shopStore.set(creds.shop_code);
            try {
              sessionStorage.removeItem(WELCOME_KEY);
            } catch {
              /* ignore */
            }
          }}
          variant="contained"
          color="secondary"
          size="large"
        >
          {t("Log in to Khanak")}
        </Button>
      </Box>
    </PublicShell>
  );
}
