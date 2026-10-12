import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
} from "@mui/icons-material";
import { Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import { AuthServices } from "../../services/AuthServices";
import "./Login.css";
import { useT } from "../../context/PrefsContext";

// The animation (and its player) load after the form so login is usable immediately.
const Lottie = lazy(() => import("lottie-react"));

export default function Login() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, auth } = useAuth();
  const [animation, setAnimation] = useState(null);

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
            {t("Invoicyfy")}
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
        </Card>
      </Fade>
    </Box>
  );
}
