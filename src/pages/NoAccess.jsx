import { Box, Button, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/LockOutlined";
import { useNavigate } from "react-router-dom";
import { useT } from "../context/PrefsContext";

export default function NoAccess() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: "center", py: 10, px: 2 }}>
      <LockIcon color="disabled" sx={{ fontSize: 56 }} />
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
        {t("You don't have access to this page")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t("Ask your admin to add this permission to your role.")}
      </Typography>
      <Button variant="contained" onClick={() => navigate("/invoices/new")}>
        {t("Go to Quick Bill")}
      </Button>
    </Box>
  );
}
