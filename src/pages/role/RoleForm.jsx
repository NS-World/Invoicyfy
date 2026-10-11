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
import { RoleServices } from "../../services/RoleServices";
import { useNavigate} from "react-router-dom";
import { useLocation } from "react-router-dom";


export default function RoleForm() {
 
  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [message, setMessage] = useState({ type: "", text: "" });
  const navigation = useNavigate();
  const location = useLocation();
  const role = location.state?.roleData;
  const role_id = role?.id;
  const rolesUrl = "/roles";


  useEffect(() => {
  if (role_id) {
    setLoading(true);
    RoleServices.getRoleDataFromId(role_id)
      .then((response) => {
        const roleData = response.data;
        setRoleName(roleData.role_name);
        setCreatedAt(roleData.created_at);
      })
      .catch((error) => {
        setMessage({ type: "error", text: error.message });
        setTimeout(() => {
          setMessage(null);
        }, 4000);
      })
      .finally(() => {
        setLoading(false); // important to reset loading here
      });
  } else {
    // For new customer add, ensure loading is false
    setLoading(false);
  }
}, [role_id]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = {
      role_id,
      role_name: roleName,
    }

    if(role_id){
        try {
          const res = await RoleServices.updateRoleData(formData); 

          if (res.status === "success") {
            localStorage.setItem("successMessage","Role Data updated successfully");
            //setFormData({ name: "", phone: "", email: "", address: "" }); // clear form
            setRoleName('');
            setCreatedAt('');
            navigation(rolesUrl);
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
    } else {
        try {
          const res = await RoleServices.postRoleData(formData); 
          // 👆 Adjust path if your backend route is different

          if (res.status === "success") {
            localStorage.setItem("successMessage","Customer added successfully");
            //setMessage({ type: "success", text: res.message });
            setRoleName('');
            setCreatedAt('');
            navigation(rolesUrl);
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
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
           {role_id ? "Edit Role" : "Add Role"}
        </Typography>


        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Role Name"
            name="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Created At"
            name="creastedAt"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            margin="normal"
            disabled
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Saving..." : role_id ? "Update Role" : "Add Role"}
          </Button>

        </Box>
      </Paper>
    </Container>
  );
}
