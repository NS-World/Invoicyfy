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
import API from "../../services/axios"; // your axios instance
import { CustomerServices } from "../../services/CustomerServices";
import { useNavigate} from "react-router-dom";
import { useLocation } from "react-router-dom";


export default function CustomerForm() {
  // const [formData, setFormData] = useState({
  //   name: "",
  //   phone: "",
  //   email: "",
  //   address: "",
  // });

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: "", text: "" });
  const navigation = useNavigate();
  const location = useLocation();
  const customer = location.state?.customersData;
  const customer_id = customer?.id;
  const cutomersUrl = "/customers";

  // const handleChange = (e) => {
  //   setFormData({
  //     ...formData,
  //     [e.target.name]: e.target.value,
  //   });
  // };

  useEffect(() => {
  if (customer_id) {
    setLoading(true);
    CustomerServices.getCustomerDataFromId(customer_id)
      .then((response) => {
        const customerData = response.data;
        setName(customerData.name);
        setPhone(customerData.phone);
        setEmail(customerData.email);
        setAddress(customerData.address);
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
}, [customer_id]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = {
      customer_id,
      name,
      phone,
      email,
      address
    }

    if(customer_id){
        try {
          const res = await CustomerServices.updateCustomerData(formData); 

          if (res.status === "success") {
            localStorage.setItem("successMessage","Customer updated successfully");
            //setFormData({ name: "", phone: "", email: "", address: "" }); // clear form
            setName('');
            setPhone('');
            setAddress('');
            setEmail('');
            navigation(cutomersUrl);
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
          const res = await CustomerServices.postCustomerData(formData); 
          // 👆 Adjust path if your backend route is different

          if (res.status === "success") {
            localStorage.setItem("successMessage","Customer added successfully");
            //setMessage({ type: "success", text: res.message });
            setName('');
            setPhone('');
            setAddress('');
            setEmail('');
            navigation(cutomersUrl);
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
           {customer_id ? "Edit Customer" : "Add Customer"}
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
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            required
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Saving..." : customer_id ? "Update Customer" : "Add Customer"}
          </Button>

        </Box>
      </Paper>
    </Container>
  );
}
