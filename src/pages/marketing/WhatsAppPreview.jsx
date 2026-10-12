import { Box, Typography } from "@mui/material";
import { useT } from "../../context/PrefsContext";

/** Phone-style preview of how the offer looks in WhatsApp. */
export default function WhatsAppPreview({ text, shop, image }) {
  const t = useT();
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider", maxWidth: 360, mx: "auto", width: "100%" }}>
      <Box sx={{ bgcolor: "#075E54", color: "#fff", px: 2, py: 1.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
          {shop || t("Your business")}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {t("Business account")}
        </Typography>
      </Box>
      <Box sx={{ bgcolor: "#ECE5DD", p: 1.5, minHeight: 200 }}>
        <Box sx={{ bgcolor: "#fff", color: "#111", borderRadius: "0 8px 8px 8px", p: 1.25, maxWidth: "92%", boxShadow: "0 1px 1px rgba(0,0,0,.12)" }}>
          {image && <Box component="img" src={image} alt="" sx={{ width: "100%", borderRadius: 1, mb: 1, display: "block" }} />}
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {text || t("Your offer message will appear here.")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", mt: 0.5 }}>
            {time}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
