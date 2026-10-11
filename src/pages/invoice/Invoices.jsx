import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, Paper } from "@mui/material";

const Invoices = () => {
  // Dummy customer data
  const rows = [
    { id: 1, name: "John Doe", email: "john@example.com", phone: "9876543210", city: "New York" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "9876501234", city: "Los Angeles" },
    { id: 3, name: "Robert Brown", email: "robert@example.com", phone: "8765432109", city: "Chicago" },
    { id: 4, name: "Emily Johnson", email: "emily@example.com", phone: "7654321098", city: "Houston" },
    { id: 5, name: "Michael Green", email: "michael@example.com", phone: "6543210987", city: "Phoenix" },
    { id: 6, name: "Sophia Wilson", email: "sophia@example.com", phone: "5432109876", city: "Dallas" },
    { id: 7, name: "Daniel White", email: "daniel@example.com", phone: "4321098765", city: "San Diego" },
    { id: 8, name: "Olivia Taylor", email: "olivia@example.com", phone: "3210987654", city: "San Jose" },
    { id: 9, name: "James Hall", email: "james@example.com", phone: "2109876543", city: "Austin" },
    { id: 10, name: "Ava Martinez", email: "ava@example.com", phone: "1098765432", city: "San Francisco" },
  ];

  // Column configuration
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Name", width: 200 },
    { field: "email", headerName: "Email", width: 250 },
    { field: "phone", headerName: "Phone", width: 150 },
    { field: "city", headerName: "City", width: 180 },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Customers
      </Typography>

      <Paper sx={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}        // rows per page
          rowsPerPageOptions={[5, 10, 20]}
          pagination
        />
      </Paper>
    </Box>
  );
};

export default Invoices;
