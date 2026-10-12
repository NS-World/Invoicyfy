import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useT } from "../context/PrefsContext";

export default function NotFound() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: "center", py: 10 }}>
      <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
        404
      </Typography>
      <Typography sx={{ mb: 3 }}>{t("This page does not exist.")}</Typography>
      <Button variant="contained" onClick={() => navigate("/dashboard")}>
        {t("Go to Dashboard")}
      </Button>
    </Box>
  );
}
