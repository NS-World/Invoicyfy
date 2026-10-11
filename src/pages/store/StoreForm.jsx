import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Alert,
} from "@mui/material";
import { StoreServices } from "../../services/StoreServices";
import { useNavigate, useLocation } from "react-router-dom";

export default function StoreForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const store = location.state?.storeData;
  const store_id = store?.store_id || store?.id; // ✅ SAFE

  const storesUrl = "/stores";

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  /* ======================
     LOAD STORE (EDIT MODE)
     ====================== */
  useEffect(() => {
    if (!store_id) return;

    setLoading(true);
    StoreServices.getStoreDataFromId(store_id)
      .then((res) => {
        const data = res.data;
        setName(data.name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setLogoUrl(data.logo_url || "");
        setCreatedAt(data.created_at || "");
      })
      .catch(() => {
        setMessage({ type: "error", text: "Failed to load store data" });
      })
      .finally(() => setLoading(false));
  }, [store_id]);

  /* ======================
     SUBMIT
     ====================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const payload = {
      store_id,
      name,
      address,
      phone,
      logo_url: logoUrl,
    };

    try {
      const res = store_id
        ? await StoreServices.updateStoreData(payload)
        : await StoreServices.postStoreData(payload);

      if (res.status === "success") {
        localStorage.setItem(
          "successMessage",
          store_id ? "Store updated successfully" : "Store added successfully"
        );
        navigate(storesUrl);
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     UI
     ====================== */
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {store_id ? "Edit Store" : "Add Store"}
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Store Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Logo URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            margin="normal"
          />

          {store_id && (
            <TextField
              fullWidth
              label="Created At"
              value={createdAt}
              margin="normal"
              disabled
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Saving..." : store_id ? "Update Store" : "Add Store"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
