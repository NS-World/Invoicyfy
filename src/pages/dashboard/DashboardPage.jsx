import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
} from "@mui/material";
import { Container } from "@mui/material";
import DashboardCards from "../../components/DashboardCards";
import Charts from "../../components/Charts";

export default function DashboardPage() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }} elevation={3}>
            <Typography variant="h6">Total Sales</Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              $5,230.00
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }} elevation={3}>
            <Typography variant="h6">Total Invoices</Typography>
            <Typography variant="h5" color="secondary" fontWeight="bold">
              23
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }} elevation={3}>
            <Typography variant="h6">Pending Payments</Typography>
            <Typography variant="h5" color="warning.main" fontWeight="bold">
              $1,200.00
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Customers & Recent Invoices */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* Customers */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Customers
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>John Doe</TableCell>
                  <TableCell>555-1234</TableCell>
                  <TableCell>johndoe@example.com</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jane Smith</TableCell>
                  <TableCell>555-5678</TableCell>
                  <TableCell>janesmith@example.com</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Acme Corp</TableCell>
                  <TableCell>555-8765</TableCell>
                  <TableCell>acmecorp@example.com</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box textAlign="right" sx={{ mt: 1 }}>
              <Button size="small">View All</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Invoices */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Recent Invoices
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>INV-0016</TableCell>
                  <TableCell>Acme Corp</TableCell>
                  <TableCell>03/23/2024</TableCell>
                  <TableCell>
                    <Chip label="Paid" color="success" size="small" />
                  </TableCell>
                  <TableCell>$500.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>INV-0015</TableCell>
                  <TableCell>Jane Smith</TableCell>
                  <TableCell>03/20/2024</TableCell>
                  <TableCell>
                    <Chip label="Pending" color="warning" size="small" />
                  </TableCell>
                  <TableCell>$750.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box textAlign="right" sx={{ mt: 1 }}>
              <Button size="small">View All</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

       <Container maxWidth="xl" sx={{ mt: 4 }}>
          <DashboardCards />
          <Charts />
        </Container>
    </Box>
  );
}
