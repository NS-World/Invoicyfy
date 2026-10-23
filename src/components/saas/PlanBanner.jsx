import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import useSaasConfig from "../../hooks/useSaasConfig";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { formatDate } from "../../utils/format";
import { loadPlanStatus, onPlanStatus } from "./planStatus";

/** Top-of-screen notice about the Khanak plan: trial days left, grace period, expired (read-only). SaaS only. */
export default function PlanBanner() {
  const t = useT();
  const cfg = useSaasConfig();
  const { isAdmin } = useAuth();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (!cfg?.saas) return undefined;
    loadPlanStatus().then(setPlan);
    return onPlanStatus(setPlan);
  }, [cfg]);

  if (!cfg?.saas || !plan) return null;
  const { status, days_left: days, valid_till: till } = plan;
  let severity = null;
  let text = "";
  if (status === "trial" && days <= 7) {
    severity = days <= 2 ? "warning" : "info";
    text = t("Free trial: {n} day(s) left. Choose a plan to keep billing without a break.", { n: Math.max(0, days) });
  } else if (status === "active" && days <= 7) {
    severity = "info";
    text = t("Your Khanak plan renews on {d}.", { d: formatDate(till) });
  } else if (status === "grace") {
    severity = "warning";
    text = t("Your plan ended on {d}. Renew within {n} days to keep billing.", { d: formatDate(till), n: plan.grace_days });
  } else if (status === "expired") {
    severity = "error";
    text = t("Your Khanak plan has expired. You can see and export everything, but new bills cannot be saved until you renew.");
  }
  if (!severity) return null;
  return (
    <Alert
      severity={severity}
      sx={{ mb: 2 }}
      className="no-print"
      data-tour="plan-banner"
      action={
        isAdmin ? (
          <Button component={RouterLink} to="/plan-billing" color="inherit" size="small" variant="outlined">
            {status === "trial" ? t("Choose plan") : t("Renew")}
          </Button>
        ) : null
      }
    >
      {text}
    </Alert>
  );
}
