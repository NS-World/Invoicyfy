import { useState } from "react";
import { Alert, Box, Button, Chip, InputAdornment, TextField, Typography } from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StarsIcon from "@mui/icons-material/Stars";
import { useT } from "../../../context/PrefsContext";
import { formatCurrency, formatNumber } from "../../../utils/format";

/**
 * Coupon code and loyalty points on a bill. The amounts shown come from the server quote,
 * so what the cashier sees is exactly what gets saved.
 * value: { coupon_code, redeem_points }, quote: server quote | null, error: message from the last quote
 */
export default function CouponPoints({ value, onChange, quote, error, hasCustomer, loyaltyEnabled }) {
  const t = useT();
  const [code, setCode] = useState("");
  const loyalty = quote?.loyalty;
  const balance = loyalty?.balance ?? null;
  const maxRedeem = loyalty?.max_redeemable_points || 0;
  const canRedeem = loyaltyEnabled && hasCustomer && balance !== null && balance >= (loyalty?.min_redeem_points || 0) && maxRedeem > 0;

  return (
    <Box sx={{ mt: 1.5 }} data-tour="coupon-box">
      {value.coupon_code ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            color={quote?.coupon ? "success" : "default"}
            icon={<LocalOfferIcon />}
            label={quote?.coupon ? `${value.coupon_code} · −${formatCurrency(quote.coupon.discount)}` : value.coupon_code}
            onDelete={() => onChange({ ...value, coupon_code: "" })}
          />
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t("Coupon code")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code) {
                e.preventDefault();
                onChange({ ...value, coupon_code: code });
                setCode("");
              }
            }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><LocalOfferIcon fontSize="small" /></InputAdornment> } }}
          />
          <Button
            variant="outlined"
            disabled={!code}
            onClick={() => {
              onChange({ ...value, coupon_code: code });
              setCode("");
            }}
          >
            {t("Apply")}
          </Button>
        </Box>
      )}
      {loyaltyEnabled && hasCustomer && balance !== null && (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <StarsIcon fontSize="small" color="warning" />
          <Typography variant="body2">
            {t("Points")}: <b>{formatNumber(balance, 0)}</b> ({formatCurrency(balance * (loyalty?.point_value || 0))})
          </Typography>
          {value.redeem_points > 0 ? (
            <Chip
              size="small"
              color="success"
              label={`${t("Using")} ${formatNumber(loyalty?.redeemed_points || value.redeem_points, 0)} · −${formatCurrency(loyalty?.discount || 0)}`}
              onDelete={() => onChange({ ...value, redeem_points: 0 })}
            />
          ) : (
            canRedeem && (
              <Button size="small" variant="outlined" onClick={() => onChange({ ...value, redeem_points: Math.floor(maxRedeem) })}>
                {t("Use {n} points", { n: formatNumber(Math.floor(maxRedeem), 0) })}
              </Button>
            )
          )}
          {loyalty?.earn_points > 0 && (
            <Typography variant="caption" color="success.main" sx={{ width: "100%" }}>
              {t("This bill will earn {n} points", { n: formatNumber(loyalty.earn_points, 0) })}
            </Typography>
          )}
        </Box>
      )}
      {error && (
        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
