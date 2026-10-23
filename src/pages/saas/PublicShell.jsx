import { Box, Button, Container, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import BrandMark from "../../components/app/BrandMark";
import PrefsSwitcher from "../../components/common/PrefsSwitcher";
import { useT } from "../../context/PrefsContext";

/** Frame of the public Khanak pages (pricing, sign-up, welcome). */
export default function PublicShell({ children, maxWidth = "lg" }) {
  const t = useT();
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Box component="header" sx={{ bgcolor: "#0b4f5c", color: "#fff" }}>
        <Container maxWidth="lg" sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
          <RouterLink to="/pricing" style={{ display: "flex", color: "inherit", textDecoration: "none", flex: 1 }}>
            <BrandMark size={30} />
          </RouterLink>
          <PrefsSwitcher short color="#fff" />
          <Button component={RouterLink} to="/login" variant="outlined" size="small" sx={{ color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>
            {t("Login")}
          </Button>
        </Container>
      </Box>
      <Container maxWidth={maxWidth} sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">{t("Khanak — Har bill ki khanak")}</Typography>
      </Box>
    </Box>
  );
}
