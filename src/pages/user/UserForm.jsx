import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { UserServices } from "../../services/UserServices";
import { RoleServices } from "../../services/RoleServices";
import { StoreServices } from "../../services/StoreServices";

export default function UserForm() {

 const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [city, setCity] = useState("");


  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);

  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();
  const location = useLocation();

  const usersUrl = "/users";

  const user = location.state?.userData;
  const user_id = user?.user_id;

  useEffect(() => {
  if (!user_id) return;

  setLoading(true);

  UserServices.getUserDataFromId(user_id)
    .then((res) => {
      const data = res.data.data;
        setName(data.name || "");
        setEmail(data.email || "");
        setRoleId(data.role_id || "");
        setStoreId(data.store_id || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
    })
    .catch(() => {
      setMessage({ type: "error", text: "Failed to load user data" });
    })
    .finally(() => setLoading(false));

    }, [user_id]);


  useEffect(() => {
  const fetchMasterData = async () => {
    try {
      const [rolesRes, storesRes] = await Promise.all([
        RoleServices.getRolesData(0, 100, ""),
        StoreServices.getStoresData(0, 100, ""),
      ]);

      if (rolesRes.status === "success") setRoles(rolesRes.data);
      if (storesRes.status === "success") setStores(storesRes.data);

    } catch (error) {
      console.error("Failed to load roles or stores", error);
    }
  };

  fetchMasterData();
  }, []);


 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage({ type: "", text: "" });

  const formData = {
    user_id,
    name,
    email,
    phone,
    city,
    store_id: storeId,
    role_id: roleId,
    };


  try {
    const res = user_id
      ? await UserServices.updateUserData({ ...formData, user_id })
      : await UserServices.postUserData(formData);

    if (res.status === "success") {
      localStorage.setItem(
        "successMessage",
        user_id ? "User updated successfully" : "User added successfully"
      );
      navigate(usersUrl);
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

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
       <Typography variant="h5" gutterBottom>
            {user_id ? "Edit User" : "Add User"}
        </Typography>


        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            margin="normal"
            required
            />


          <FormControl fullWidth margin="normal" required>
            <InputLabel id="store-label">Store</InputLabel>
            <Select
                labelId="store-label"
                value={storeId}
                label="Store"
                onChange={(e) => setStoreId(e.target.value)}
            >
                {stores.map((store) => (
                <MenuItem key={store.store_id} value={store.store_id}>
                    {store.name}
                </MenuItem>
                ))}
            </Select>
            </FormControl>


        <FormControl fullWidth margin="normal" required>
          <InputLabel id="role-label">Role</InputLabel>
            <Select
                labelId="role-label"
                value={roleId}
                label="Role"
                onChange={(e) => setRoleId(e.target.value)}
            >
                {roles.map((role) => (
                <MenuItem key={role.role_id} value={role.role_id}>
                    {role.role_name}
                </MenuItem>
                ))}
            </Select>
        </FormControl>


        <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
            >
            {loading ? "Saving..." : user_id ? "Update User" : "Add User"}
        </Button>

        </Box>
      </Paper>
    </Container>
  );
}
