import { lazy, Suspense, useEffect, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Fade,
} from "@mui/material";
import {
  Email,
  Lock,
  PointOfSale,
  ReceiptLong,
  MoneyOff,
  CloudOff,
  Storefront,
} from "@mui/icons-material";
import { Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import { AuthServices } from "../../services/AuthServices";
import "./Login.css";
import { useT } from "../../context/PrefsContext";
import InstallApp from "../../components/app/InstallApp";
import BrandMark from "../../components/app/BrandMark";
import useSaasConfig from "../../hooks/useSaasConfig";
import { shopStore } from "../../services/axios";

// The animation (and its player) load after the form so login is usable immediately.
const Lottie = lazy(() => import("lottie-react"));

const HIGHLIGHTS = [
  [<PointOfSale key="a" />, "Quick Bill & KOT", "Tap items by category, weight or scoop — bill and kitchen slip in seconds."],
  [<ReceiptLong key="b" />, "GST invoices & reports", "Retail receipts, B2B tax invoices, GST summary and daily reports."],
  [<MoneyOff key="c" />, "Udhaar, coupons & loyalty", "Track dues, send reminders and bring customers back."],
  [<CloudOff key="d" />, "Works without internet", "Bills are saved on the device and sent when the internet is back."],
];

export default function Login() {
  const t = useT();
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, auth } = useAuth();
  const [animation, setAnimation] = useState(null);
  const saas = useSaasConfig();
  const [shop, setShop] = useState(() => (params.get("shop") || shopStore.code || "").toLowerCase());

  useEffect(() => {
    import("../../assets/robot-invoice.json").then((m) => setAnimation(m.default)).catch(() => {});
  }, []);

  if (auth.token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter email and password");
        setLoading(false);
        return;
      }

      if (saas?.saas) {
        const code = shop.trim().toLowerCase();
        if (!code) {
          setError(t("Enter your shop code (it is in your welcome email)"));
          setLoading(false);
          return;
        }
        shopStore.set(code);
      }
      const res = await AuthServices.postLoginData(email, password);
      if (res.data?.status === "success" && res.data?.access_token && res.data?.refresh_token) {
        login(res.data.user || null, res.data.access_token, res.data.refresh_token);
        setEmail("");
        setPassword("");
        navigate("/", { replace: true });
      } else {
        setError(res.data?.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || (err.message === "Network Error" ? "Cannot reach the server. Check your connection." : "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-container">
      <Box className="login-shell">
      {/* Brand panel beside the form (large screens only). */}
      <Box className="login-hero" aria-hidden="true">
        <span className="login-hero-circle c1" />
        <span className="login-hero-circle c2" />
        <Box sx={{ position: "relative" }}>
          <Typography className="login-hero-brand" component="div"><BrandMark size={34} nameSize={22} /></Typography>
          <Typography className="login-hero-title">{t("Billing made simple for your shop")}</Typography>
          <Box component="ul" className="login-hero-list">
            {HIGHLIGHTS.map(([icon, title, text]) => (
              <li key={title}>
                <span className="login-hero-icon">{icon}</span>
                <span>
                  <strong>{t(title)}</strong>
                  <small>{t(text)}</small>
                </span>
              </li>
            ))}
          </Box>
        </Box>
        <Typography className="login-hero-foot">{t("Secure login · Your data stays on your own server")}</Typography>
      </Box>
      <Fade in timeout={600}>
        <Card className="login-card" elevation={10}>
          <Box className="robot-animation">
            {animation && (
              <Suspense fallback={null}>
                <Lottie animationData={animation} loop />
              </Suspense>
            )}
          </Box>

          <Typography variant="h4" align="center" className="login-title">
            {t("Khanak")}
          </Typography>
          <Typography align="center" className="login-subtitle">
            {t("Get your invoice in just 2 minutes.")}
          </Typography>

          {params.get("expired") && !error && (
            <Alert severity="info" sx={{ mb: 1 }}>
              {t("Your session expired. Please login again.")}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            {saas?.saas && (
              <TextField
                fullWidth
                margin="normal"
                label={t("Shop code")}
                autoComplete="organization"
                required
                disabled={loading}
                value={shop}
                onChange={(e) => setShop(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                helperText={t("From your Khanak welcome email, e.g. scoopiez-surat")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Storefront />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <TextField
              fullWidth
              margin="normal"
              label={t("Email")}
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              type="password"
              label={t("Password")}
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
              }}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1, textAlign: "center" }}>
                {error}
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{ mt: 3, py: 1.4, fontWeight: "bold", fontSize: "16px" }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
            </Button>
          </form>
          {saas?.saas && (
            <Typography align="center" variant="body2" sx={{ mt: 2 }}>
              {t("New shop?")}{" "}
              <RouterLink to="/pricing" style={{ fontWeight: 700 }}>
                {t("See plans and start free")}
              </RouterLink>
            </Typography>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <InstallApp label />
          </div>
        </Card>
      </Fade>
      </Box>
    </Box>
  );
}
