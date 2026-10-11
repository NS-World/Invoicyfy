import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { CircularProgress } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import API from "../../services/axios";
import Lottie from "lottie-react";
import robotAnimation from "../../assets/robot-invoice.json"; // 👈 download from LottieFiles
import { AuthServices } from "../../services/AuthServices";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      console.log("Login Response:", res);

      if (res.data?.status === "success" && res.data?.access_token && res.data?.refresh_token) {
        login(null, res.data.access_token, res.data.refresh_token);
        setEmail("");
        setPassword("");
        navigate("/");
      } else {
        setError(res.data?.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-container">
      <Fade in timeout={600}>
        <Card className="login-card" elevation={10}>
          <Box className="robot-animation">
            <Lottie animationData={robotAnimation} loop={true} />
          </Box>

          <Typography variant="h4" align="center" className="login-title">
            Invoicyfy
          </Typography>
          <Typography align="center" className="login-subtitle">
            Get your invoice in just 2 minutes.
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              type="email"
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
              label="Password"
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
